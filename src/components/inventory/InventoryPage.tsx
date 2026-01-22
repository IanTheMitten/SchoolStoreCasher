import { useState } from 'react';
import { FiltersColumn } from './FiltersColumn';
import { InventoryTable } from './InventoryTable';
import { ProductDetailPane } from './ProductDetailPane';
import { AddProductModal } from './AddProductModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import type { Product, StockAdjustment } from '../../App';

interface InventoryPageProps {
  products: Product[];
  stockHistory: StockAdjustment[];
  onUpdateProducts: (products: Product[]) => void;
  onAddStockAdjustment: (adjustment: StockAdjustment) => void;
  categories?: { id: string; name: string }[];
  onCreateCategory?: (name: string) => Promise<any>;
  onDeleteCategory?: (id: string) => Promise<any>;
}

export function InventoryPage({
  products,
  stockHistory,
  onUpdateProducts,
  onAddStockAdjustment
  ,categories = [], onCreateCategory, onDeleteCategory
}: InventoryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'adjust' | null>(null);

  const productCategories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLowStock = !lowStockOnly || product.stock < product.reorderLevel;
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesLowStock && matchesCategory;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setLowStockOnly(false);
    setCategoryFilter('all');
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Name', 'Category', 'Unit Cost (₩)', 'Price (₩)', 'Stock', 'Reorder Level'];
    const rows = products.map(p => [
      p.sku,
      p.name,
      p.category,
      Math.round(p.unitCost).toString(),
      Math.round(p.price).toString(),
      p.stock.toString(),
      p.reorderLevel.toString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddProduct = (product: Product) => {
    onUpdateProducts([...products, product]);
    setShowAddModal(false);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    onUpdateProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      onUpdateProducts(products.filter(p => p.id !== productId));
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-70px)]">
      {/* Left Column - Filters (20%) */}
      <div className="w-[20%] border-r border-gray-200 overflow-auto">
        <FiltersColumn
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          lowStockOnly={lowStockOnly}
          onLowStockChange={setLowStockOnly}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
            categories={categories.length ? categories : productCategories.map((c) => ({ id: `cat-${c}`, name: c }))}
          onResetFilters={handleResetFilters}
          onAddProduct={() => setShowAddModal(true)}
          onExportCSV={handleExportCSV}
            onAddCategory={onCreateCategory}
            onDeleteCategory={onDeleteCategory}
        />
      </div>

      {/* Middle Column - Table (60% or 80% when detail closed) */}
      <div className={selectedProduct ? 'w-[60%]' : 'w-[80%]'}>
        <InventoryTable
          products={filteredProducts}
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
          onAddStock={(product) => {
            setSelectedProduct(product);
            setAdjustmentMode('add');
          }}
          onAdjust={(product) => {
            setSelectedProduct(product);
            setAdjustmentMode('adjust');
          }}
          onDelete={handleDeleteProduct}
        />
      </div>

      {/* Right Column - Detail Pane (20%) */}
      {selectedProduct && (
        <div className="w-[20%] border-l border-gray-200 overflow-auto">
          <ProductDetailPane
            product={selectedProduct}
            stockHistory={stockHistory.filter(h => h.productId === selectedProduct.id)}
            onClose={() => setSelectedProduct(null)}
            onAddStock={() => setAdjustmentMode('add')}
            onAdjust={() => setAdjustmentMode('adjust')}
            onUpdate={handleUpdateProduct}
          />
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onAdd={handleAddProduct}
          onClose={() => setShowAddModal(false)}
          categories={categories.length ? categories : productCategories.map((c) => ({ id: `cat-${c}`, name: c }))}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustmentMode && selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          mode={adjustmentMode}
          onComplete={(adjustment) => {
            onAddStockAdjustment(adjustment);
            setAdjustmentMode(null);
          }}
          onClose={() => setAdjustmentMode(null)}
        />
      )}
    </div>
  );
}
