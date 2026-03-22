import { useMemo } from 'react';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction, Product } from '../../App';

interface RevenueByProductTableProps {
  transactions: Transaction[];
  products: Product[];
}

export function RevenueByProductTable({ transactions }: RevenueByProductTableProps) {
  const { formatCurrency } = useCurrency();
  const productData = useMemo(() => {
    const map = new Map<string, { product: any; unitsSold: number; revenue: number }>();
    
    transactions.forEach(t => {
      t.items.forEach(item => {
        const existing = map.get(item.product.id) || {
          product: item.product,
          unitsSold: 0,
          revenue: 0
        };
        
        map.set(item.product.id, {
          product: item.product,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + (item.product.price * item.quantity)
        });
      });
    });
    
    const total = Array.from(map.values()).reduce((sum, item) => sum + item.revenue, 0);
    
    return Array.from(map.values())
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.revenue / total) * 100 : 0,
        avgPrice: item.revenue / item.unitsSold
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [transactions]);

  return (
    <Card className="p-6">
      <h3 className="text-gray-900 mb-4">Revenue by Product</h3>
      
      {productData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No sales data for selected period
        </div>
      ) : (
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Product</th>
                <th className="text-right p-2 text-gray-600">Units</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
                <th className="text-right p-2 text-gray-600">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productData.map(item => (
                <tr key={item.product.id} className="hover:bg-gray-50">
                  <td className="p-2">
                    <div className="text-gray-900">{item.product.name}</div>
                    <div className="text-gray-500 text-xs">Avg: {formatCurrency(item.avgPrice)}</div>
                  </td>
                  <td className="p-2 text-right text-gray-900">{item.unitsSold}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(item.revenue)}</td>
                  <td className="p-2 text-right text-gray-600">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
