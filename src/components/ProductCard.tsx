import { Plus, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Product } from '../App';
import { formatKRW } from '../utils/formatCurrency';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const getStockBadge = () => {
    if (product.stock === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="size-3" />
          Out of Stock
        </Badge>
      );
    } else if (product.stock <= 4) {
      return (
        <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 border-orange-200">
          <AlertTriangle className="size-3" />
          Low Stock ({product.stock})
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="size-3" />
          In Stock ({product.stock})
        </Badge>
      );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 truncate">{product.name}</h3>
          <p className="text-gray-600 mt-1">{formatKRW(product.price)}</p>
        </div>
        {getStockBadge()}
      </div>
      
      {product.description && (
        <p className="text-gray-500 text-sm">{product.description}</p>
      )}
      
      <Button
        onClick={() => onAdd(product)}
        disabled={product.stock === 0}
        className="w-full gap-2"
        size="sm"
      >
        <Plus className="size-4" />
        Add to Cart
      </Button>
    </div>
  );
}
