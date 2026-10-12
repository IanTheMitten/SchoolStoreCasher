import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FiltersColumn } from './FiltersColumn';
import { InventoryTable } from './InventoryTable';
import { ProductDetailPane } from './ProductDetailPane';
import { ProductDialog } from './ProductDialog';
import type { ProductDialogTarget } from './ProductDialog';
import { useScanner } from '../../contexts/ScannerContext';
import type { Product, StockAdjustment } from '../../App';

interface InventoryPageProps {
  products: Product[];
  stockHistory: StockAdjustment[];
  onUpdateProducts: (products: Product[]) => Promise<void> | void;
  onAddStockAdjustment: (adjustment: StockAdjustment) => Promise<void> | void;
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<ProductDialogTarget | null>(null);
  const { registerHandler, unregisterHandler } = useScanner();

  // Look up by id so the detail pane always shows current stock/price after edits.
  const selectedProduct = products.find(p => p.id === selectedProductId) || null;
  const setSelectedProduct = (product: Product | null) => setSelectedProductId(product?.id ?? null);
  const openEdit = (product: Product) => {
    setSelectedProductId(product.id);
    setDialogTarget({ kind: 'edit', productId: product.id });
  };

  // Scan anywhere on this page: known barcode opens that product, unknown starts a new one.
  // (While the product dialog is open, its own higher-priority handler takes over.)
  const handleScan = useCallback((scanned: string) => {
    const code = scanned.trim().toLowerCase();
    const match = products.find(p => (p.barcode || '').trim().toLowerCase() === code);
    if (match) {
      setSelectedProductId(match.id);
      setDialogTarget({ kind: 'edit', productId: match.id });
    } else {
      setDialogTarget({ kind: 'add', barcode: scanned.trim() });
      toast.info(`New barcode ${scanned.trim()} — add the product`);
    }
  }, [products]);

  useEffect(() => {
    registerHandler({ id: 'inventory-scanner', priority: 5, handler: handleScan });
    return () => unregisterHandler('inventory-scanner');
  }, [registerHandler, unregisterHandler, handleScan]);

  const productCategories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode || '').toLowerCase().includes(searchQuery.toLowerCase());
    
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
    const headers = ['Name', 'Category', 'Unit Cost (₩)', 'Price (₩)', 'Stock', 'Reorder Level'];
    const rows = products.map(p => [
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
    setDialogTarget(null);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    await onUpdateProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
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
          onAddProduct={() => setDialogTarget({ kind: 'add' })}
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
          onEdit={openEdit}
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
            onEdit={() => openEdit(selectedProduct)}
          />
        </div>
      )}

      {dialogTarget && (
        <ProductDialog
          target={dialogTarget}
          products={products}
          categories={categories.length ? categories : productCategories.map((c) => ({ id: `cat-${c}`, name: c }))}
          onCreated={handleAddProduct}
          onSave={handleUpdateProduct}
          onAddStockAdjustment={onAddStockAdjustment}
          onTargetChange={(target) => {
            if (target.kind === 'edit') setSelectedProductId(target.productId);
            setDialogTarget(target);
          }}
          onClose={() => setDialogTarget(null)}
        />
      )}
    </div>
  );
}
