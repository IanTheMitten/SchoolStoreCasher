import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { PackagePlus, Save, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';
import { productsAPI } from '../../services/api';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useScanner } from '../../contexts/ScannerContext';
import type { Product, StockAdjustment } from '../../App';

// One dialog for both adding a product and editing one. Editing shows the same fields
// (price, cost, barcode, ...) plus a stock section for restocks and corrections.

export type ProductDialogTarget = { kind: 'add'; barcode?: string } | { kind: 'edit'; productId: string };

interface ProductDialogProps {
  target: ProductDialogTarget;
  products: Product[];
  categories?: { id?: string; name: string }[] | string[];
  onCreated: (product: Product) => void;
  onSave: (product: Product) => Promise<void> | void;
  onAddStockAdjustment: (adjustment: StockAdjustment) => Promise<void> | void;
  onTargetChange: (target: ProductDialogTarget) => void;
  onClose: () => void;
}

const defaultCategories = ['Stationery', 'Uniform', 'Electronics', 'Art', 'Accessories'];
const BARCODE_ALLOWED_PATTERN = import.meta.env.VITE_BARCODE_ALLOWED_PATTERN || '^\\d+$';
const BARCODE_ALLOWED_REGEX = new RegExp(BARCODE_ALLOWED_PATTERN);
const BARCODE_ALLOWED_LENGTHS = (import.meta.env.VITE_BARCODE_ALLOWED_LENGTHS || '8,13')
  .split(',')
  .map((item: string) => Number(item.trim()))
  .filter((item: number) => Number.isInteger(item) && item > 0);

const STOCK_REASONS = [
  { value: 'restock', label: 'Restock (bought more)' },
  { value: 'correction', label: 'Inventory correction' },
  { value: 'damage', label: 'Damaged items' },
  { value: 'return', label: 'Customer return' },
];

const sameBarcode = (a?: string, b?: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const formFromProduct = (product: Product | undefined, fallbackCategory: string, barcode = '') => ({
  name: product?.name ?? '',
  price: product ? String(product.price) : '',
  unitCost: product ? String(product.unitCost) : '',
  description: product?.description ?? '',
  category: product?.category || fallbackCategory,
  stock: '',
  reorderLevel: product ? String(product.reorderLevel) : '',
  supplier: product?.supplier ?? '',
  barcode: product?.barcode ?? barcode,
});

export function ProductDialog({
  target,
  products,
  categories,
  onCreated,
  onSave,
  onAddStockAdjustment,
  onTargetChange,
  onClose,
}: ProductDialogProps) {
  const { formatCurrency } = useCurrency();
  const { registerHandler, unregisterHandler } = useScanner();

  const resolvedCategories = (categories && categories.length)
    ? categories.map((c: any) => (typeof c === 'string' ? { name: c } : { name: c.name }))
    : defaultCategories.map((n) => ({ name: n }));
  const fallbackCategory = resolvedCategories[0]?.name || 'Stationery';

  const editing = target.kind === 'edit' ? products.find(p => p.id === target.productId) : undefined;
  const isEdit = target.kind === 'edit';

  const [formData, setFormData] = useState(() =>
    formFromProduct(editing, fallbackCategory, target.kind === 'add' ? target.barcode : ''));
  const [stockForm, setStockForm] = useState({ quantity: '', reason: 'restock', unitCost: '', reference: '' });
  const [busy, setBusy] = useState(false);

  // Reset the form whenever the dialog switches to a different product (e.g. after a scan).
  const targetKey = target.kind === 'edit' ? `edit:${target.productId}` : `add:${target.barcode || ''}`;
  useEffect(() => {
    setFormData(formFromProduct(editing, fallbackCategory, target.kind === 'add' ? target.barcode : ''));
    setStockForm({ quantity: '', reason: 'restock', unitCost: editing ? String(editing.unitCost) : '', reference: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  // A scan while the dialog is open: jump to that product if it exists, otherwise use it as
  // this product's barcode (new products, or existing ones that don't have a barcode yet).
  const handleScan = useCallback((scanned: string) => {
    const code = scanned.trim();
    const match = products.find(p => sameBarcode(p.barcode, code));
    if (match) {
      if (editing?.id === match.id) {
        toast.info(`Already editing ${match.name}`);
      } else {
        onTargetChange({ kind: 'edit', productId: match.id });
        toast.info(`Opened ${match.name}`);
      }
      return;
    }
    if (isEdit && editing?.barcode) {
      toast.error(`No product has barcode ${code}. Clear this product's barcode first to assign it.`);
      return;
    }
    setFormData(prev => ({ ...prev, barcode: code }));
    toast.success(`Barcode ${code} set`);
  }, [products, editing, isEdit, onTargetChange]);

  useEffect(() => {
    registerHandler({ id: 'product-dialog', priority: 20, handler: handleScan });
    return () => unregisterHandler('product-dialog');
  }, [registerHandler, unregisterHandler, handleScan]);

  const validateBarcode = (barcode: string) => {
    if (!barcode) return true;
    if (!BARCODE_ALLOWED_REGEX.test(barcode)) {
      toast.error('Barcode contains unsupported characters');
      return false;
    }
    if (BARCODE_ALLOWED_LENGTHS.length > 0 && !BARCODE_ALLOWED_LENGTHS.includes(barcode.length)) {
      toast.error(`Barcode length must be one of: ${BARCODE_ALLOWED_LENGTHS.join(', ')}`);
      return false;
    }
    const duplicate = products.find(p => p.id !== editing?.id && sameBarcode(p.barcode, barcode));
    if (duplicate) {
      toast.error(`Barcode already exists on "${duplicate.name}"`);
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.price || !formData.unitCost || !formData.stock || !formData.reorderLevel) {
      toast.error('Please fill in all required fields');
      return;
    }
    const barcode = formData.barcode.trim();
    if (!validateBarcode(barcode)) return;

    setBusy(true);
    try {
      const result = await productsAPI.create({
        name: formData.name,
        price: parseFloat(formData.price),
        unit_cost: parseFloat(formData.unitCost),
        description: formData.description,
        category: formData.category,
        stock: parseInt(formData.stock),
        reorderLevel: parseInt(formData.reorderLevel),
        supplier: formData.supplier || undefined,
        barcode: barcode || undefined
      }) as any;

      onCreated({
        id: result.id,
        sku: result.sku || '',
        name: result.name,
        price: result.price,
        unitCost: result.unit_cost || parseFloat(formData.unitCost),
        description: result.description || formData.description,
        category: result.category || formData.category,
        stock: result.stock,
        reorderLevel: result.reorderLevel || parseInt(formData.reorderLevel),
        supplier: result.supplier,
        barcode: result.barcode,
      });
      toast.success('Product added successfully');
    } catch (error: any) {
      console.error('Error adding product:', error);
      const errorMessage = error?.message || '';
      if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('barcode already exists')) {
        toast.error('A product with that barcode already exists');
      } else {
        toast.error(errorMessage || 'Failed to add product');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!formData.name || !formData.price || !formData.unitCost || !formData.reorderLevel) {
      toast.error('Please fill in all required fields');
      return;
    }
    const barcode = formData.barcode.trim();
    if (!validateBarcode(barcode)) return;

    setBusy(true);
    try {
      await onSave({
        ...editing,
        name: formData.name,
        price: parseFloat(formData.price),
        unitCost: parseFloat(formData.unitCost),
        description: formData.description,
        category: formData.category,
        reorderLevel: parseInt(formData.reorderLevel),
        supplier: formData.supplier || undefined,
        barcode: barcode || undefined,
      });
      toast.success('Product saved');
      onClose();
    } catch {
      // onSave already reverted and showed a toast
    } finally {
      setBusy(false);
    }
  };

  const handleApplyStock = async () => {
    if (!editing) return;
    const quantity = parseInt(stockForm.quantity);
    if (isNaN(quantity) || quantity === 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (stockForm.reason === 'restock' && quantity < 0) {
      toast.error('Restock quantity must be positive');
      return;
    }
    if (editing.stock + quantity < 0) {
      toast.error('That would make stock negative');
      return;
    }
    const unitCost = parseFloat(stockForm.unitCost);
    if (stockForm.reason === 'restock' && (isNaN(unitCost) || unitCost < 0)) {
      toast.error('Please enter the unit cost for this restock');
      return;
    }

    setBusy(true);
    try {
      await onAddStockAdjustment({
        id: `adj${Date.now()}`,
        productId: editing.id,
        date: new Date(),
        quantity,
        reason: stockForm.reason as any,
        reference: stockForm.reference || undefined,
        unitCost: stockForm.reason === 'restock' ? unitCost : undefined,
        user: 'staff',
      });
      // App shows the success/error toast for stock changes.
      setStockForm(prev => ({ ...prev, quantity: '', reference: '' }));
    } finally {
      setBusy(false);
    }
  };

  if (isEdit && !editing) return null;

  const priceChanged = editing && formData.price !== '' && parseFloat(formData.price) !== editing.price;
  const stockQty = parseInt(stockForm.quantity);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add New Product'}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <ScanLine className="size-4" />
            Scan any barcode — it fills the barcode field, or opens that product if it already exists.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Scan or type"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Notebook (A4)"
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolvedCategories.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                ))}
                {editing && !resolvedCategories.some(c => c.name === editing.category) && editing.category && (
                  <SelectItem value={editing.category}>{editing.category}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="unitCost">Unit Cost *</Label>
            <Input
              id="unitCost"
              type="number"
              step="1"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="price">Selling Price *</Label>
            <Input
              id="price"
              type="number"
              step="1"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
            {priceChanged && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Was {formatCurrency(editing!.price)}. Past sales keep the price they were sold at.
              </p>
            )}
          </div>

          {!isEdit && (
            <div>
              <Label htmlFor="stock">Initial Stock *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
          )}

          <div>
            <Label htmlFor="reorderLevel">Reorder Level *</Label>
            <Input
              id="reorderLevel"
              type="number"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X className="size-4 mr-2" />
            {isEdit ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={isEdit ? handleSaveEdit : handleAdd} disabled={busy}>
            <Save className="size-4 mr-2" />
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogFooter>

        {editing && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h4 className="text-gray-900">Stock</h4>
                <span className="text-sm text-gray-600">Current: {editing.stock} units</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock-reason">Reason</Label>
                  <Select value={stockForm.reason} onValueChange={(value) => setStockForm({ ...stockForm, reason: value })}>
                    <SelectTrigger id="stock-reason"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOCK_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stock-qty">{stockForm.reason === 'restock' ? 'Quantity to add' : 'Quantity change (+/-)'}</Label>
                  <Input
                    id="stock-qty"
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    placeholder={stockForm.reason === 'restock' ? 'e.g., 50' : 'e.g., -5 or 10'}
                  />
                </div>
                {stockForm.reason === 'restock' && (
                  <div>
                    <Label htmlFor="stock-cost">Unit cost for this restock</Label>
                    <Input
                      id="stock-cost"
                      type="number"
                      step="1"
                      value={stockForm.unitCost}
                      onChange={(e) => setStockForm({ ...stockForm, unitCost: e.target.value })}
                    />
                  </div>
                )}
                <div className={stockForm.reason === 'restock' ? '' : 'col-span-2'}>
                  <Label htmlFor="stock-ref">Reference / Note</Label>
                  <Input
                    id="stock-ref"
                    value={stockForm.reference}
                    onChange={(e) => setStockForm({ ...stockForm, reference: e.target.value })}
                    placeholder="e.g., Invoice #12345"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {!isNaN(stockQty) && stockQty !== 0 ? `New stock: ${editing.stock + stockQty} units` : ''}
                </span>
                <Button variant="secondary" onClick={handleApplyStock} disabled={busy}>
                  <PackagePlus className="size-4 mr-2" />
                  Apply Stock Change
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
