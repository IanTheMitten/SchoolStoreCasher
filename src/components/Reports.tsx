import { useState, useMemo } from 'react';
import { Calendar, DollarSign, ShoppingCart, TrendingUp, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import type { Sale, Product } from '../App';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
}

export function Reports({ sales, products }: ReportsProps) {
  const [selectedDate, setSelectedDate] = useState<string>('today');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      saleDate.setHours(0, 0, 0, 0);
      
      let dateMatch = false;
      if (selectedDate === 'today') {
        dateMatch = saleDate.getTime() === today.getTime();
      } else if (selectedDate === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateMatch = saleDate >= weekAgo;
      } else if (selectedDate === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        dateMatch = saleDate >= monthAgo;
      } else {
        dateMatch = true; // all
      }

      const paymentMatch = selectedPaymentMethod === 'all' || sale.paymentMethod === selectedPaymentMethod;
      
      return dateMatch && paymentMatch;
    });
  }, [sales, selectedDate, selectedPaymentMethod, today]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = filteredSales.length;
    const totalItems = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
      totalRevenue,
      totalTransactions,
      totalItems,
      averageTransaction
    };
  }, [filteredSales]);

  const paymentMethodBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    filteredSales.forEach(sale => {
      if (!breakdown[sale.paymentMethod]) {
        breakdown[sale.paymentMethod] = { count: 0, total: 0 };
      }
      breakdown[sale.paymentMethod].count++;
      breakdown[sale.paymentMethod].total += sale.total;
    });
    return breakdown;
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    const productSales: Record<string, { product: Product; quantity: number; revenue: number }> = {};
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.product.id]) {
          productSales[item.product.id] = {
            product: item.product,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.product.id].quantity += item.quantity;
        productSales[item.product.id].revenue += item.product.price * item.quantity;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 4).sort((a, b) => a.stock - b.stock);
  }, [products]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'bank': return 'Bank Transfer';
      default: return method;
    }
  };

  const handleExportReport = () => {
    const reportData = {
      period: selectedDate,
      generatedAt: new Date().toISOString(),
      stats,
      sales: filteredSales.map(sale => ({
        id: sale.id,
        timestamp: sale.timestamp,
        student: sale.student.name,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        items: sale.items.map(item => ({
          product: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-store-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-gray-900 mb-1">Reports & Budget</h2>
          <p className="text-gray-600">Track sales, revenue, and inventory</p>
        </div>
        <Button onClick={handleExportReport}>
          <Download className="size-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger>
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="bank">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="size-5 text-green-600" />
            </div>
            <div className="text-gray-600 text-sm">Total Revenue</div>
          </div>
          <div className="text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="size-5 text-blue-600" />
            </div>
            <div className="text-gray-600 text-sm">Transactions</div>
          </div>
          <div className="text-gray-900">{stats.totalTransactions}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="size-5 text-purple-600" />
            </div>
            <div className="text-gray-600 text-sm">Items Sold</div>
          </div>
          <div className="text-gray-900">{stats.totalItems}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="size-5 text-orange-600" />
            </div>
            <div className="text-gray-600 text-sm">Avg Transaction</div>
          </div>
          <div className="text-gray-900">{formatCurrency(stats.averageTransaction)}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Recent Transactions</h3>
          
          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found for selected period
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {filteredSales.slice().reverse().map(sale => (
                <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-gray-900">{sale.student.name}</div>
                      <div className="text-gray-500 text-sm">{formatDate(sale.timestamp)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900">{formatCurrency(sale.total)}</div>
                      <Badge variant="outline" className="mt-1">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm">
                    {sale.items.length} item(s) • {sale.items.reduce((sum, item) => sum + item.quantity, 0)} units
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Top Selling Products</h3>
          
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sales data available
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((item, index) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 truncate">{item.product.name}</div>
                    <div className="text-gray-600 text-sm">{item.quantity} units sold</div>
                  </div>
                  <div className="text-gray-900">{formatCurrency(item.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Payment Methods</h3>
          
          {Object.keys(paymentMethodBreakdown).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment data available
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentMethodBreakdown).map(([method, data]) => (
                <div key={method} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-gray-900">{getPaymentMethodLabel(method)}</div>
                    <div className="text-gray-900">{formatCurrency(data.total)}</div>
                  </div>
                  <div className="text-gray-600 text-sm">{data.count} transactions</div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${(data.total / stats.totalRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Low Stock Alert</h3>
          
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All products are well stocked
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 truncate">{product.name}</div>
                    <div className="text-gray-600 text-sm">{product.category}</div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                    {product.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
