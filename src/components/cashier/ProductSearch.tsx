import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatKRW } from '../../utils/formatCurrency';
import type { Product } from '../../App';

interface ProductSearchProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

const quickItems = ['Notebook (A4)', 'Pencil Set', 'Eraser', 'Ruler (30cm)'];

export function ProductSearch({ products, onAddToCart, searchInputRef }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const quickProducts = products.filter(p => quickItems.includes(p.name));

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      const key = p.category || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredProducts]);

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return { label: 'Out of Stock', className: 'bg-gray-100 text-gray-600 border-gray-200' };
    } else if (stock <= 4) {
      return { label: `${stock} left`, className: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    return { label: `${stock} left`, className: 'bg-green-100 text-green-800 border-green-200' };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-[56px]"
            autoFocus
          />
        </div>
      </div>

      {/* Quick Items */}
      {!searchQuery && (
        <div className="p-4 border-b border-gray-200">
          <div className="text-gray-600 text-sm mb-3">Quick Access</div>
          <div className="grid grid-cols-2 gap-3">
            {quickProducts.map(product => (
              <Button
                key={product.id}
                variant="outline"
                onClick={() => onAddToCart(product)}
                disabled={product.stock === 0}
                className="h-[80px] flex flex-col items-start justify-between p-4"
              >
                <div className="text-gray-900 text-left">{product.name}</div>
                <div className="text-gray-600 text-sm">{formatKRW(product.price)}</div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Product List grouped by Category */}
      <div className="flex-1 overflow-auto">
        {Object.entries(productsByCategory).map(([category, items]) => (
          <div key={category} className="border-b border-gray-200">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {category}
            </div>
            <div className="divide-y divide-gray-200">
              {items.map(product => {
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
                      <div className="text-gray-500 text-sm">{product.sku}</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={stockBadge.className}>
                        {stockBadge.label}
                      </Badge>
                      <div className="text-gray-900 text-right w-20">
                        {formatKRW(product.price)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No products found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
