import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useCurrency } from '../../contexts/CurrencyContext';
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();

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

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 shrink-0">
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
          <div className="flex-1 min-h-0 overflow-y-scroll overscroll-contain touch-pan-y">
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
