import { StudentSelector } from './StudentSelector';
import { CartItemRow } from './CartItemRow';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { ShoppingCart, CreditCard, Banknote, Wallet, AlertCircle } from 'lucide-react';
import type { CartItem, Student } from '../App';
import { useCurrency } from '../contexts/CurrencyContext';

interface CartPanelProps {
  cart: CartItem[];
  selectedStudent: Student | null;
  students: Student[];
  paymentMethod: string;
  note: string;
  total: number;
  canCheckout: boolean;
  isCheckingOut: boolean;
  checkoutError: string | null;
  onSelectStudent: (student: Student | null) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onNoteChange: (note: string) => void;
  onCheckout: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank', label: 'Bank Transfer', icon: Wallet }
];

export function CartPanel({
  cart,
  selectedStudent,
  students,
  paymentMethod,
  note,
  total,
  canCheckout,
  isCheckingOut,
  checkoutError,
  onSelectStudent,
  onUpdateQuantity,
  onRemoveFromCart,
  onPaymentMethodChange,
  onNoteChange,
  onCheckout
}: CartPanelProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24 max-h-[calc(100vh-120px)] flex flex-col">
      {/* Student Selector */}
      <div className="mb-6">
        <Label htmlFor="student-search" className="mb-2 block">
          Select Student
        </Label>
        <StudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelect={onSelectStudent}
        />
      </div>

      {/* Selected Student Display */}
      {selectedStudent && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-gray-900">{selectedStudent.name}</div>
          <div className="text-gray-600 text-sm">
            {selectedStudent.grade} • {selectedStudent.gender}
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-auto mb-6 min-h-[200px]">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="size-5 text-gray-600" />
          <h2 className="text-gray-900">Cart ({cart.length})</h2>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Cart is empty. Add products to begin.
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <CartItemRow
                key={item.product.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemoveFromCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="mb-6 pt-6 border-t border-gray-200">
        <Label className="mb-3 block">Payment Method</Label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map(method => {
            const Icon = method.icon;
            return (
              <button
                key={method.value}
                onClick={() => onPaymentMethodChange(method.value)}
                className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  paymentMethod === method.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Pay with ${method.label}`}
                aria-pressed={paymentMethod === method.value}
              >
                <Icon className="size-5" />
                <span className="text-sm">{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Note */}
      <div className="mb-6">
        <Label htmlFor="checkout-note" className="mb-2 block">
          Note (optional)
        </Label>
        <Textarea
          id="checkout-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add a note for this sale..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Error Display */}
      {checkoutError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{checkoutError}</AlertDescription>
        </Alert>
      )}

      {/* Total */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        disabled={!canCheckout}
        className="w-full"
        size="lg"
      >
        {isCheckingOut ? 'Processing...' : 'Confirm Checkout'}
      </Button>

      {!selectedStudent && cart.length > 0 && (
        <p className="text-sm text-gray-500 text-center mt-2">
          Select a student to proceed
        </p>
      )}
    </div>
  );
}
