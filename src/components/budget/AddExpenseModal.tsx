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
import type { Expense, Product } from '../../App';

interface AddExpenseModalProps {
  products: Product[];
  onAdd: (expense: Expense) => void;
  onClose: () => void;
}

const NONE_PRODUCT = '__none__';

const expenseCategories = [
  'Utilities',
  'Supplies',
  'Equipment',
  'Maintenance',
  'Marketing',
  'Other'
];

export function AddExpenseModal({ products, onAdd, onClose }: AddExpenseModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Utilities',
    note: '',
    productId: NONE_PRODUCT,
    receiptRef: ''
  });

  const handleSubmit = () => {
    if (!formData.amount || !formData.category) {
      toast.error('Please fill in required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }



    const expense: Expense = {
      id: `exp${Date.now()}`,
      date: new Date(),
      category: formData.category,
      amount,
      note: formData.note,
      productId: formData.productId === NONE_PRODUCT ? undefined : formData.productId,
      receiptRef: formData.receiptRef || undefined
    };

    onAdd(expense);
    toast.success('Expense recorded successfully');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
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
                {expenseCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="product">
              Related Product (optional)
            </Label>
            <Select
              value={formData.productId}
              onValueChange={(value) => setFormData({ ...formData, productId: value })}
            >
              <SelectTrigger id="product">
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_PRODUCT}>None</SelectItem>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div>
            <Label htmlFor="receiptRef">Receipt Reference</Label>
            <Input
              id="receiptRef"
              value={formData.receiptRef}
              onChange={(e) => setFormData({ ...formData, receiptRef: e.target.value })}
              placeholder="e.g., INV-12345"
            />
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Additional details..."
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
            Record Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
