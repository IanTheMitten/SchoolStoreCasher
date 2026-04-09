import React from 'react';
import { Search, Plus, Download, Trash } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface FiltersColumnProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lowStockOnly: boolean;
  onLowStockChange: (checked: boolean) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  categories: { id: string; name: string }[];
  onResetFilters: () => void;
  onAddProduct: () => void;
  onExportCSV: () => void;
  onAddCategory?: (name: string) => Promise<any>;
  onDeleteCategory?: (id: string) => Promise<any>;
}

export function FiltersColumn({
  searchQuery,
  onSearchChange,
  lowStockOnly,
  onLowStockChange,
  categoryFilter,
  onCategoryChange,
  categories,
  onResetFilters,
  onAddProduct,
  onExportCSV
  ,onAddCategory, onDeleteCategory
}: FiltersColumnProps) {
  const [newCategory, setNewCategory] = React.useState('');

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    try {
      await onAddCategory?.(newCategory.trim());
      setNewCategory('');
    } catch (e) {
      // ignore
    }
  };
  return (
    <div className="p-4 space-y-6">
      {/* Search */}
      <div>
        <Label className="mb-2 block text-sm">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Product name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-12"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <Label className="text-sm">Filters</Label>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="low-stock"
            checked={lowStockOnly}
            onCheckedChange={(checked) => onLowStockChange(checked as boolean)}
          />
          <Label htmlFor="low-stock" className="text-sm cursor-pointer">
            Low stock only
          </Label>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Category</Label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(categories || []).map(cat => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category management */}
        <div className="pt-3">
          <Label className="text-sm mb-2 block">Manage Categories</Label>
          <div className="flex gap-2">
            <Input placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button onClick={handleAdd} size="sm">
              <Plus className="size-4 mr-2" /> Add
            </Button>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            {(categories || []).map(cat => (
              <div key={cat.id} className="flex items-center justify-between bg-white p-2 rounded border">
                <div>{cat.name}</div>
                <Button variant="ghost" size="sm" onClick={() => onDeleteCategory?.(cat.id)}>
                  <Trash className="size-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={onResetFilters} className="w-full" size="sm">
          Reset Filters
        </Button>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-6 border-t border-gray-200">
        <Button onClick={onAddProduct} className="w-full">
          <Plus className="size-4 mr-2" />
          Add New Product
        </Button>
        
        <Button variant="outline" onClick={onExportCSV} className="w-full">
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
