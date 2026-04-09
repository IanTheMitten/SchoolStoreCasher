import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useCurrency } from '../../contexts/CurrencyContext';
import { toast } from 'sonner';
import type { Product } from '../../App';

interface ProductSearchProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  scannerStatus: string;
  showConnectScanner: boolean;
  onConnectScanner: () => void;
  isConnectingScanner: boolean;
}

export function ProductSearch({
  products,
  onAddToCart,
  searchInputRef,
  scannerStatus,
  showConnectScanner,
  onConnectScanner,
  isConnectingScanner,
}: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const lastKeyTsRef = useRef<number | null>(null);
  const fastKeyCountRef = useRef(0);
  const { formatCurrency } = useCurrency();
  const SCAN_BURST_MAX_INTERVAL_MS = 45;
  const MIN_FAST_KEYS_FOR_SCAN = 4;

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      (product.sku || '').toLowerCase().includes(query) ||
      (product.barcode || '').toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      const key = (p.category || '').trim() || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredProducts]);

  const categories = useMemo(() => Object.keys(productsByCategory).sort(), [productsByCategory]);

  // Auto-select first category when categories change
  useEffect(() => {
    if (categories.length > 0 && (selectedCategory === null || !categories.includes(selectedCategory))) {
      setSelectedCategory(categories[0]);
    } else if (categories.length === 0) {
      setSelectedCategory(null);
    }
  }, [categories, selectedCategory]);

  const productsInSelectedCategory = useMemo(() => {
    if (!selectedCategory || !productsByCategory[selectedCategory]) return [];
    return productsByCategory[selectedCategory];
  }, [selectedCategory, productsByCategory]);

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return { label: 'Out of Stock', className: 'bg-gray-100 text-gray-600 border-gray-200' };
    } else if (stock <= 4) {
      return { label: `${stock} left`, className: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    return { label: `${stock} left`, className: 'bg-green-100 text-green-800 border-green-200' };
  };

  const resetScanBurstTracking = () => {
    lastKeyTsRef.current = null;
    fastKeyCountRef.current = 0;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (scanError) {
      setScanError(null);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    if (event.key === 'Enter') {
      const query = searchQuery.trim();
      const isLikelyScannerInput =
        fastKeyCountRef.current >= MIN_FAST_KEYS_FOR_SCAN &&
        query.length >= MIN_FAST_KEYS_FOR_SCAN;

      if (!isLikelyScannerInput || !query) {
        resetScanBurstTracking();
        return;
      }

      event.preventDefault();
      const normalizedBarcode = query.toLowerCase();
      const barcodeMatches = products.filter(
        (product) => (product.barcode || '').trim().toLowerCase() === normalizedBarcode
      );

      if (barcodeMatches.length === 1) {
        onAddToCart(barcodeMatches[0]);
        setSearchQuery('');
        setScanError(null);
      } else if (barcodeMatches.length > 1) {
        const message = 'Multiple products share that barcode. Please fix barcode data.';
        setScanError(message);
        toast.error(message);
      } else {
        const message = 'No exact barcode match found. Please check and try again.';
        setScanError(message);
        toast.error(message);
      }

      resetScanBurstTracking();
      return;
    }

    if (event.key.length === 1) {
      if (lastKeyTsRef.current !== null && now - lastKeyTsRef.current <= SCAN_BURST_MAX_INTERVAL_MS) {
        fastKeyCountRef.current += 1;
      } else {
        fastKeyCountRef.current = 1;
      }
      lastKeyTsRef.current = now;
      return;
    }

    resetScanBurstTracking();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Scan barcode here or type manually."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className={`pl-10 h-[56px] ${scanError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            autoFocus
          />
        </div>
        {scanError && <p className="mt-2 text-xs text-red-600">{scanError}</p>}

        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-xs text-gray-700">{scannerStatus}</span>
          {showConnectScanner && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onConnectScanner}
              disabled={isConnectingScanner}
            >
              {isConnectingScanner ? 'Connecting...' : 'Connect Scanner'}
            </Button>
          )}
        </div>
      </div>

      {/* Category + Products split layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Categories */}
        <div className="w-[880px] shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
          <div className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
            Categories
          </div>
          <div className="flex-1 min-h-0 overflow-y-scroll overscroll-contain py-1 touch-pan-y">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full px-5 py-4 text-left text-base transition-colors flex items-center gap-2 ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-gray-200/70 text-gray-700'
                }`}
              >
                <span className="truncate flex-1 min-w-0">{category}</span>
                <span className="text-sm opacity-75 shrink-0">({productsByCategory[category].length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Products in selected category */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No products found matching "{searchQuery}"
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {productsInSelectedCategory.map((product) => {
                  const stockBadge = getStockBadge(product.stock);
                  return (
                    <button
                      key={product.id}
                      onClick={() => onAddToCart(product)}
                      disabled={product.stock === 0}
                      className={`w-full h-[64px] px-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left ${
                        product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 truncate">{product.name}</div>
                        <div className="text-gray-500 text-sm">{product.sku || ''}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={stockBadge.className}>
                          {stockBadge.label}
                        </Badge>
                        <div className="text-gray-900 text-right w-20">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
