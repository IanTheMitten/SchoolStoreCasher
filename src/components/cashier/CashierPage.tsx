import { useState, useRef, useEffect } from 'react';
import { ProductSearch } from './ProductSearch';
import { CartSection } from './CartSection';
import { ReceiptModal } from './ReceiptModal';
import { toast } from 'sonner';
import type { Product, Student, CartItem, Transaction } from '../../App';
import {
  detectScannerCapability,
  requestScannerConnection,
  startScannerStream,
  stopScannerStream,
  type ScannerCapability,
  type ScannerMode,
} from '../../services/scanner';

interface CashierPageProps {
  products: Product[];
  students: Student[];
  teachers?: any[];
  onAddTransaction: (transaction: Transaction) => void;
}

export function CashierPage({ products, students, teachers = [], onAddTransaction }: CashierPageProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [scannerCapability, setScannerCapability] = useState<ScannerCapability | null>(null);
  const [isConnectingScanner, setIsConnectingScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('keyboard');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search after transaction
  useEffect(() => {
    if (!completedTransaction) {
      searchInputRef.current?.focus();
    }
  }, [completedTransaction]);

  useEffect(() => {
    const loadScannerCapability = async () => {
      const capability = await detectScannerCapability();
      setScannerCapability(capability);
      setScannerMode(capability.mode);
    };

    void loadScannerCapability();
  }, []);


  const handleScannedCode = (scannedCode: string) => {
    const normalizedBarcode = scannedCode.trim().toLowerCase();

    if (!normalizedBarcode) {
      return;
    }

    const barcodeMatches = products.filter(
      (product) => (product.barcode || '').trim().toLowerCase() === normalizedBarcode,
    );

    if (barcodeMatches.length === 1) {
      handleAddToCart(barcodeMatches[0]);
      return;
    }

    if (barcodeMatches.length > 1) {
      toast.error('Multiple products share that barcode. Please fix barcode data.');
      return;
    }

    toast.error(`No product found for barcode: ${scannedCode}`);
  };

  const handleConnectScanner = async () => {
    if (!scannerCapability) return;

    try {
      setIsConnectingScanner(true);
      const mode = await requestScannerConnection(scannerCapability);
      setScannerMode(mode);

      if (mode === 'hid' || mode === 'serial') {
        toast.success('Scanner connected successfully');
      }
    } catch {
      toast.error('Scanner connection cancelled or failed');
    } finally {
      setIsConnectingScanner(false);
    }
  };


  useEffect(() => {
    if (scannerMode !== 'hid' && scannerMode !== 'serial') {
      void stopScannerStream();
      return;
    }

    let isMounted = true;

    const startStream = async () => {
      try {
        await startScannerStream(handleScannedCode, {
          mode: scannerMode,
          serialBaudRate: 9600,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setScannerMode('keyboard');
        toast.error(
          error instanceof Error
            ? `Failed to start ${scannerMode.toUpperCase()} scanner stream: ${error.message}`
            : `Failed to start ${scannerMode.toUpperCase()} scanner stream`,
        );
      }
    };

    void startStream();

    return () => {
      isMounted = false;
      void stopScannerStream();
    };
  }, [scannerMode, products]);

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(item => item.product.id === product.id);

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast.error(`Cannot add more ${product.name}. Stock limit reached.`);
          return currentCart;
        }

        return currentCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { product, quantity: 1 }];
    });

    toast.success(`${product.name} added to cart`);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find(item => item.product.id === productId);
    
    if (!item) return;

    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      toast.success('Item removed from cart');
      return;
    }

    if (newQuantity > item.product.stock) {
      toast.error(`Cannot exceed stock limit of ${item.product.stock}`);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
    toast.success('Item removed from cart');
  };

  const handleCompleteTransaction = (transaction: Transaction) => {
    onAddTransaction(transaction);
    setCompletedTransaction(transaction);
    setCart([]);
    toast.success('Transaction completed successfully!');
  };

  const handleCloseReceipt = () => {
    setCompletedTransaction(null);
    searchInputRef.current?.focus();
  };

  const scannerApiStatus = scannerCapability?.message ?? 'Checking scanner support...';
  const isConnectedMode = ['hid', 'serial', 'usb'].includes(scannerMode as string);
  const scannerConnectionStatus =
    isConnectedMode
      ? `Connected (${scannerMode.toUpperCase()} mode)`
      : scannerCapability?.needsConnection
        ? 'Not connected'
        : 'No direct connection needed';

  return (
    <div className="flex h-[calc(100vh-70px)] min-h-0">
      {/* Left Side - Product Search (65%) */}
      <div className="w-[65%] border-r border-gray-200 overflow-hidden min-h-0">
        <ProductSearch
          products={products}
          onAddToCart={handleAddToCart}
          searchInputRef={searchInputRef}
          scannerStatus={`${scannerApiStatus}; ${scannerConnectionStatus}`}
          showConnectScanner={
            Boolean(scannerCapability?.needsConnection) &&
            !isConnectedMode
          }
          onConnectScanner={handleConnectScanner}
          isConnectingScanner={isConnectingScanner}
        />
      </div>

      {/* Right Side - Cart (35%) */}
      <div className="w-[35%] overflow-hidden min-h-0">
        <CartSection
          cart={cart}
          students={students}
          teachers={teachers}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          onCompleteTransaction={handleCompleteTransaction}
        />
      </div>

      {/* Receipt Modal */}
      {completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          onClose={handleCloseReceipt}
        />
      )}
    </div>
  );
}
