import { X, Plus, Settings, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Product, StockAdjustment } from '../../App';

interface ProductDetailPaneProps {
  product: Product;
  stockHistory: StockAdjustment[];
  onClose: () => void;
  onAddStock: () => void;
  onAdjust: () => void;
  onUpdate: (product: Product) => void;
}

export function ProductDetailPane({
  product,
  stockHistory,
  onClose,
  onAddStock,
  onAdjust
}: ProductDetailPaneProps) {
  const { formatCurrency } = useCurrency();

  const getStockStatus = () => {
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

  const status = getStockStatus();
  const recentHistory = stockHistory.slice(-5).reverse();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'restock': return 'Restock';
      case 'correction': return 'Correction';
      case 'damage': return 'Damage';
      case 'return': return 'Return';
      default: return reason;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 truncate">{product.name}</h3>
            <p className="text-gray-500 text-sm">{product.sku}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Current Stock */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-gray-600 text-sm mb-2">Current Stock</div>
          <div className="text-gray-900 mb-2">{product.stock} units</div>
          <Badge className={status.className}>{status.label}</Badge>
          
          {product.stock < product.reorderLevel && (
            <div className="mt-3 text-orange-600 text-sm">
              Below reorder level ({product.reorderLevel})
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button onClick={onAddStock} className="w-full" size="sm">
            <Plus className="size-4 mr-2" />
            Add Stock
          </Button>
          <Button onClick={onAdjust} variant="outline" className="w-full" size="sm">
            <Settings className="size-4 mr-2" />
            Adjust Quantity
          </Button>
        </div>

        {/* Supplier Info */}
        {product.supplier && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-gray-600 text-sm mb-2">Supplier</div>
            <div className="text-gray-900 text-sm">{product.supplier}</div>
            <div className="text-gray-500 text-xs mt-1">
              Last cost: {formatCurrency(product.unitCost)}
            </div>
          </div>
        )}

        {/* Stock History */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="size-4 text-gray-400" />
            <div className="text-gray-600 text-sm">Stock History</div>
          </div>

          {recentHistory.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No history available
            </div>
          ) : (
            <div className="space-y-2">
              {recentHistory.map(adjustment => (
                <div key={adjustment.id} className="text-sm pb-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className={adjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                      {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
                    </div>
                    <div className="text-gray-500 text-xs">{formatDate(adjustment.date)}</div>
                  </div>
                  <div className="text-gray-600 text-xs">{getReasonLabel(adjustment.reason)}</div>
                  {adjustment.reference && (
                    <div className="text-gray-500 text-xs">{adjustment.reference}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {stockHistory.length > 5 && (
            <Button variant="link" size="sm" className="w-full mt-2 text-xs">
              View full history ({stockHistory.length} entries)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
