import { Plus, Settings, Trash2, History } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Product } from '../../App';

interface InventoryTableProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onAddStock: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function InventoryTable({
  products,
  selectedProduct,
  onSelectProduct,
  onAddStock,
  onAdjust,
  onDelete
}: InventoryTableProps) {
  const getStockBadge = (product: Product) => {
    const ratio = product.stock / product.reorderLevel;
    
    if (product.stock === 0) {
      return { label: 'Out of Stock', className: 'bg-gray-100 text-gray-600' };
    } else if (ratio < 1) {
      return { label: 'Low Stock', className: 'bg-red-100 text-red-800' };
    } else if (ratio < 1.5) {
      return { label: 'Warning', className: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'In Stock', className: 'bg-green-100 text-green-800' };
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  const formatKRW = (amount: number) => {
    try {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(amount));
    } catch (e) {
      return `₩${Math.round(amount)}`;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
          <tr>
            <th className="text-left p-3 text-gray-600 text-sm">SKU</th>
            <th className="text-left p-3 text-gray-600 text-sm">Product Name</th>
            <th className="text-left p-3 text-gray-600 text-sm">Category</th>
            <th className="text-right p-3 text-gray-600 text-sm">Unit Cost</th>
            <th className="text-right p-3 text-gray-600 text-sm">Price</th>
            <th className="text-center p-3 text-gray-600 text-sm">Stock</th>
            <th className="text-center p-3 text-gray-600 text-sm">Reorder</th>
            <th className="text-center p-3 text-gray-600 text-sm">Status</th>
            <th className="text-center p-3 text-gray-600 text-sm">Last Restock</th>
            <th className="text-right p-3 text-gray-600 text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map(product => {
            const stockBadge = getStockBadge(product);
            const isSelected = selectedProduct?.id === product.id;
            
            return (
              <tr
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="p-3 text-gray-600 text-sm">{product.sku}</td>
                <td className="p-3">
                  <div className="text-gray-900">{product.name}</div>
                  <div className="text-gray-500 text-sm truncate max-w-xs">{product.description}</div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">{product.category}</Badge>
                </td>
                <td className="p-3 text-right text-gray-900 text-sm">{formatKRW(product.unitCost)}</td>
                <td className="p-3 text-right text-gray-900 text-sm">{formatKRW(product.price)}</td>
                <td className="p-3 text-center text-gray-900">{product.stock}</td>
                <td className="p-3 text-center text-gray-600 text-sm">{product.reorderLevel}</td>
                <td className="p-3 text-center">
                  <Badge className={stockBadge.className}>{stockBadge.label}</Badge>
                </td>
                <td className="p-3 text-center text-gray-600 text-sm">{formatDate(product.lastRestock)}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddStock(product)}
                      title="Add Stock"
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAdjust(product)}
                      title="Adjust"
                    >
                      <Settings className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(product.id)}
                      title="Delete"
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          No products found
        </div>
      )}
    </div>
  );
}
