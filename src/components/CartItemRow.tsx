import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { CartItem } from '../App';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onUpdateQuantity(item.product.id, value);
    }
  };

  const lineTotal = item.product.price * item.quantity;

  const formatKRW = (amount: number) => {
    try {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(amount));
    } catch (e) {
      return `₩${Math.round(amount)}`;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-gray-900 truncate">{item.product.name}</h4>
          <p className="text-gray-600 text-sm">{formatKRW(item.product.price)} each</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.product.id)}
          className="shrink-0"
          aria-label={`Remove ${item.product.name}`}
        >
          <Trash2 className="size-4 text-red-600" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            disabled={item.quantity <= 0}
            className="size-8 p-0"
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </Button>
          
          <Input
            type="number"
            value={item.quantity}
            onChange={handleQuantityChange}
            min="0"
            max={item.product.stock}
            className="w-16 text-center"
            aria-label="Quantity"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            disabled={item.quantity >= item.product.stock}
            className="size-8 p-0"
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="text-right">
          <div className="text-gray-900">{formatKRW(lineTotal)}</div>
          {item.quantity > item.product.stock && (
            <div className="text-red-600 text-xs">
              Exceeds stock!
            </div>
          )}
        </div>
      </div>

      {item.product.stock - item.quantity <= 2 && item.quantity < item.product.stock && (
        <div className="mt-2 text-xs text-orange-600">
          Only {item.product.stock - item.quantity} more available
        </div>
      )}
    </div>
  );
}
