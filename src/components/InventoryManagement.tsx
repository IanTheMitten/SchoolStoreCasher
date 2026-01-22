import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import type { Product } from '../App';
import { formatKRW } from '../utils/formatCurrency';

interface InventoryManagementProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const categories = ['Stationery', 'Uniform', 'Electronics', 'Art', 'Accessories'];

export function InventoryManagement({ products, onUpdateProducts }: InventoryManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Stationery',
    stock: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description,
        category: product.category,
        stock: product.stock.toString()
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        description: '',
        category: 'Stationery',
        stock: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = () => {
    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock);

    if (!formData.name || isNaN(price) || isNaN(stock)) {
      alert('Please fill in all fields correctly');
      return;
    }

    if (editingProduct) {
      // Update existing product
      const updatedProducts = products.map(p =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: formData.name,
              price,
              description: formData.description,
              category: formData.category,
              stock
            }
          : p
      );
      onUpdateProducts(updatedProducts);
    } else {
      // Add new product
      const newProduct: Product = {
        id: `p${Date.now()}`,
        name: formData.name,
        price,
        description: formData.description,
        category: formData.category,
        stock
      };
      onUpdateProducts([...products, newProduct]);
    }

    handleCloseDialog();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      onUpdateProducts(products.filter(p => p.id !== productId));
    }
  };

  const handleAdjustStock = (productId: string, adjustment: number) => {
    const updatedProducts = products.map(p =>
      p.id === productId
        ? { ...p, stock: Math.max(0, p.stock + adjustment) }
        : p
    );
    onUpdateProducts(updatedProducts);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stock <= 4) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Low Stock</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-gray-900 mb-1">Inventory Management</h2>
            <p className="text-gray-600">Manage products and stock levels</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="size-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Product</th>
                <th className="text-left p-3 text-gray-600">Category</th>
                <th className="text-right p-3 text-gray-600">Price</th>
                <th className="text-center p-3 text-gray-600">Stock</th>
                <th className="text-center p-3 text-gray-600">Status</th>
                <th className="text-right p-3 text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="text-gray-900">{product.name}</div>
                    <div className="text-gray-500 text-sm">{product.description}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{product.category}</Badge>
                  </td>
                  <td className="p-3 text-right text-gray-900">{formatKRW(product.price)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustStock(product.id, -1)}
                        disabled={product.stock === 0}
                        className="size-8 p-0"
                      >
                        -
                      </Button>
                      <span className="text-gray-900 w-12 text-center">{product.stock}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustStock(product.id, 1)}
                        className="size-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {getStockBadge(product.stock)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No products found
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details and stock' : 'Enter product information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Notebook (A4)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="product-price">Price (₩)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    step="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
              </div>

              <div>
                <Label htmlFor="product-stock">Stock</Label>
                <Input
                  id="product-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="product-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="size-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveProduct}>
              <Save className="size-4 mr-2" />
              {editingProduct ? 'Update' : 'Add'} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
