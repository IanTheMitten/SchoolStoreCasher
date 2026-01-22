import { useState } from 'react';
import { ProductList } from './ProductList';
import { CartPanel } from './CartPanel';
import { mockProducts, mockStudents } from '../data/mockData';
import type { Product, Student, CartItem, Sale } from '../App';
import { Users, Printer } from 'lucide-react';
import { Button } from './ui/button';

interface CashierScreenProps {
  onCheckoutSuccess: (sale: Sale) => void;
  products: Product[];
  students: Student[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateStudents: (students: Student[]) => void;
}

export function CashierScreen({ onCheckoutSuccess, products: propProducts, students: propStudents, onUpdateProducts, onUpdateStudents }: CashierScreenProps) {
  // Initialize with mock data if empty
  const [products, setProducts] = useState<Product[]>(propProducts.length > 0 ? propProducts : mockProducts);
  const [students, setStudents] = useState<Student[]>(propStudents.length > 0 ? propStudents : mockStudents);
  
  // Sync with parent on changes
  const updateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    onUpdateProducts(newProducts);
  };
  
  const updateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    onUpdateStudents(newStudents);
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [note, setNote] = useState<string>('');
  const [lastUsedPayment] = useState<string>('cash');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleAddToCart = (product: Product) => {
    setCheckoutError(null);
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Check if we can add more
      if (existingItem.quantity >= product.stock) {
        setCheckoutError(`Cannot add more ${product.name}. Stock limit reached.`);
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock === 0) {
        setCheckoutError(`${product.name} is out of stock.`);
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setCheckoutError(null);
    const item = cart.find(item => item.product.id === productId);
    
    if (!item) return;
    
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }
    
    if (newQuantity > item.product.stock) {
      setCheckoutError(`Cannot exceed stock limit of ${item.product.stock} for ${item.product.name}.`);
      return;
    }
    
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCheckoutError(null);
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleCheckout = async () => {
    if (!selectedStudent || cart.length === 0) return;
    
    setIsCheckingOut(true);
    setCheckoutError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Validate stock one more time
      for (const item of cart) {
        if (item.quantity > item.product.stock) {
          throw new Error(`Insufficient stock for ${item.product.name}`);
        }
      }
      
      const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      const sale: Sale = {
        id: `SALE-${Date.now()}`,
        student: selectedStudent,
        items: cart,
        paymentMethod,
        total,
        timestamp: new Date(),
        note: note || undefined
      };
      
      // Update stock after sale
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.product.id === product.id);
        if (cartItem) {
          return { ...product, stock: product.stock - cartItem.quantity };
        }
        return product;
      });
      updateProducts(updatedProducts);
      
      // Clear cart and selection
      setCart([]);
      setSelectedStudent(null);
      setNote('');
      setPaymentMethod(lastUsedPayment);
      
      onCheckoutSuccess(sale);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const canCheckout = selectedStudent !== null && cart.length > 0 && !isCheckingOut;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto">
        {/* Left: Products */}
        <div className="flex-1 min-w-0">
          <ProductList products={products} onAddToCart={handleAddToCart} />
        </div>

        {/* Right: Cart */}
        <div className="lg:w-[420px] shrink-0">
          <CartPanel
            cart={cart}
            selectedStudent={selectedStudent}
            students={students}
            paymentMethod={paymentMethod}
            note={note}
            total={total}
            canCheckout={canCheckout}
            isCheckingOut={isCheckingOut}
            checkoutError={checkoutError}
            onSelectStudent={setSelectedStudent}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onPaymentMethodChange={setPaymentMethod}
            onNoteChange={setNote}
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    </div>
  );
}