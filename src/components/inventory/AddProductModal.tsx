import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { productsAPI } from '../../services/api';
import type { Product } from '../../App';

interface AddProductModalProps {
  onAdd: (product: Product) => void;
  onClose: () => void;
  categories?: { id?: string; name: string }[] | string[];
}

const defaultCategories = ['Stationery', 'Uniform', 'Electronics', 'Art', 'Accessories'];

export function AddProductModal({ onAdd, onClose, categories }: AddProductModalProps) {
  const resolvedCategories = (categories && categories.length)
    ? categories.map((c: any) => (typeof c === 'string' ? { name: c } : { name: c.name }))
    : defaultCategories.map((n) => ({ name: n }));

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: '',
    unitCost: '',
    description: '',
    category: resolvedCategories[0]?.name || 'Stationery',
    stock: '',
    reorderLevel: '',
    supplier: '',
    barcode: ''
  });

  const handleSubmit = async () => {
    if (!formData.sku || !formData.name || !formData.price || !formData.unitCost || !formData.stock || !formData.reorderLevel) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const result = await productsAPI.create({
        sku: formData.sku,
        name: formData.name,
        price: parseFloat(formData.price),
        unit_cost: parseFloat(formData.unitCost),
        description: formData.description,
        category: formData.category,
        stock: parseInt(formData.stock),
        reorderLevel: parseInt(formData.reorderLevel),
        supplier: formData.supplier || undefined,
        barcode: formData.barcode || undefined
      });

      const newProduct: Product = {
        id: result.id,
        sku: result.sku || formData.sku,
        name: result.name,
        price: result.price,
        unitCost: result.unit_cost || parseFloat(formData.unitCost),
        description: result.description || formData.description,
        category: result.category || formData.category,
        stock: result.stock,
        reorderLevel: result.reorderLevel || parseInt(formData.reorderLevel),
        supplier: result.supplier,
        barcode: result.barcode,
      };

      onAdd(newProduct);
      toast.success('Product added successfully');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || 'Failed to add product');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., STN-001"
            />
          </div>

          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Optional"
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
            <Label htmlFor="unitCost">Unit Cost (₩) *</Label>
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
            <Label htmlFor="price">Selling Price (₩) *</Label>
            <Input
              id="price"
              type="number"
              step="1"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
          </div>

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
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="size-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="size-4 mr-2" />
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
