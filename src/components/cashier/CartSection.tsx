import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CashPaymentModal } from './CashPaymentModal';
import { useCurrency } from '../../contexts/CurrencyContext';
import { roundMoney } from '../../utils/formatCurrency';
import type { CartItem, Student, Transaction } from '../../App';

interface CartSectionProps {
  cart: CartItem[];
  students: Student[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCompleteTransaction: (transaction: Transaction) => void;
}

const TAX_RATE = 0.0; // Set to 0 for no tax, or e.g., 0.08 for 8%

export function CartSection({
  cart,
  students,
  onUpdateQuantity,
  onRemoveFromCart,
  onCompleteTransaction
}: CartSectionProps) {
  const [paymentMode, setPaymentMode] = useState<'cash' | null>(null);
  const { formatCurrency } = useCurrency();

  const rawSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const subtotal = roundMoney(rawSubtotal);
  const tax = roundMoney(subtotal * TAX_RATE);
  const total = roundMoney(subtotal + tax);

  const handlePaymentComplete = (transaction: Transaction) => {
    onCompleteTransaction(transaction);
    setPaymentMode(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Cart Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-gray-900">Current Transaction</h2>
        <p className="text-gray-600 text-sm">{cart.length} items</p>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Cart is empty. Scan or select items to begin.
          </div>
        ) : (
          cart.map(item => (
            <div key={item.product.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 truncate">{item.product.name}</div>
                  <div className="text-gray-500 text-sm">{formatCurrency(item.product.price)} each</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFromCart(item.product.id)}
                  className="shrink-0 -mt-1 -mr-1"
                >
                  <X className="size-4 text-red-600" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="size-8 p-0"
                  >
                    <Minus className="size-4" />
                  </Button>
                  
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        onUpdateQuantity(item.product.id, val);
                      }
                    }}
                    className="w-14 text-center h-8"
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="size-8 p-0"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <div className="text-gray-900">
                  {formatCurrency(item.product.price * item.quantity)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {TAX_RATE > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-900 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment Buttons */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-3">
        <Button
          onClick={() => setPaymentMode('cash')}
          disabled={cart.length === 0}
          className="w-full h-[70px]"
          variant="outline"
        >
          Cash Payment
        </Button>
      </div>

      {/* Cash Payment Modal */}
      {paymentMode === 'cash' && (
        <CashPaymentModal
          total={total}
          subtotal={subtotal}
          tax={tax}
          cart={cart}
          students={students}
          onComplete={handlePaymentComplete}
          onClose={() => setPaymentMode(null)}
        />
      )}
    </div>
  );
}
