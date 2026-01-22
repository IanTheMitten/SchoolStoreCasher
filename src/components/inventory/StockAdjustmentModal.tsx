import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, StockAdjustment } from '../../App';

interface StockAdjustmentModalProps {
  product: Product;
  mode: 'add' | 'adjust';
  onComplete: (adjustment: StockAdjustment) => void;
  onClose: () => void;
}

export function StockAdjustmentModal({
  product,
  mode,
  onComplete,
  onClose
}: StockAdjustmentModalProps) {
  const [formData, setFormData] = useState({
    quantity: '',
    reason: mode === 'add' ? 'restock' : 'correction',
    reference: '',
    unitCost: product.unitCost.toString()
  });

  const reasons = mode === 'add'
    ? [{ value: 'restock', label: 'Restock' }]
    : [
        { value: 'correction', label: 'Inventory Correction' },
        { value: 'damage', label: 'Damaged Items' },
        { value: 'return', label: 'Customer Return' }
      ];

  const handleSubmit = () => {
    const quantity = parseInt(formData.quantity);
    
    if (isNaN(quantity) || quantity === 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (mode === 'add' && quantity < 0) {
      toast.error('Quantity must be positive for restocking');
      return;
    }

    if (!formData.reason) {
      toast.error('Please select a reason');
      return;
    }

    const adjustment: StockAdjustment = {
      id: `adj${Date.now()}`,
      productId: product.id,
      date: new Date(),
      quantity: mode === 'add' ? Math.abs(quantity) : quantity,
      reason: formData.reason as any,
      reference: formData.reference || undefined,
      unitCost: formData.reason === 'restock' ? parseFloat(formData.unitCost) : undefined,
      user: 'John Smith' // TODO: Get from auth
    };

    onComplete(adjustment);
    toast.success(`Stock ${mode === 'add' ? 'added' : 'adjusted'} successfully`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Stock' : 'Adjust Stock'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-900">{product.name}</div>
            <div className="text-gray-600 text-sm">Current stock: {product.stock} units</div>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">
              {mode === 'add' ? 'Quantity to Add' : 'Quantity Change'} *
            </Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder={mode === 'add' ? 'e.g., 50' : 'e.g., -5 or +10'}
            />
            {mode === 'adjust' && (
              <p className="text-gray-500 text-xs mt-1">
                Use negative numbers to reduce stock
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
            >
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Cost (only for restock) */}
          {formData.reason === 'restock' && (
            <div>
              <Label htmlFor="unitCost">Unit Cost (₩)</Label>
              <Input
                id="unitCost"
                type="number"
                step="1"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              />
            </div>
          )}

          {/* Reference */}
          <div>
            <Label htmlFor="reference">Reference / Note</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g., Invoice #12345"
            />
          </div>

          {/* Preview */}
          {formData.quantity && !isNaN(parseInt(formData.quantity)) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-blue-600 text-sm mb-1">New Stock Level</div>
              <div className="text-blue-900">
                {product.stock + (mode === 'add' ? Math.abs(parseInt(formData.quantity)) : parseInt(formData.quantity))} units
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="size-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="size-4 mr-2" />
            {mode === 'add' ? 'Add Stock' : 'Apply Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
