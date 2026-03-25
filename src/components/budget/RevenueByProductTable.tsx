import { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import { productsAPI } from '../../services/api';
import type { Transaction, Product } from '../../App';

interface RevenueByProductTableProps {
  transactions: Transaction[];
  products: Product[];
}

interface InventoryAdjustment {
  id: string;
  productId: string;
  date: string;
  quantity: number;
  reason: string;
}

const toDayKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getInStockDayCount = ({
  product,
  adjustments,
  rangeStart,
  rangeEnd,
}: {
  product: Product;
  adjustments: InventoryAdjustment[];
  rangeStart: Date;
  rangeEnd: Date;
}) => {
  const startDay = new Date(rangeStart);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date(rangeEnd);
  endDay.setHours(0, 0, 0, 0);

  if (endDay < startDay) {
    return 0;
  }

  const currentStock = Number(product.stock || 0);
  const adjustmentsAfterStart = adjustments.filter((adj) => new Date(adj.date) >= startDay);
  const stockAtRangeStart = adjustmentsAfterStart.reduce((stock, adj) => stock - Number(adj.quantity || 0), currentStock);

  const dailyChanges = new Map<string, number>();
  adjustmentsAfterStart.forEach((adj) => {
    const adjDate = new Date(adj.date);
    if (adjDate > endDay) {
      return;
    }

    const key = toDayKey(adjDate);
    dailyChanges.set(key, (dailyChanges.get(key) || 0) + Number(adj.quantity || 0));
  });

  let inStockDays = 0;
  let stockAtDayStart = stockAtRangeStart;

  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    if (stockAtDayStart > 0) {
      inStockDays += 1;
    }

    const key = toDayKey(d);
    stockAtDayStart += dailyChanges.get(key) || 0;
  }

  return inStockDays;
};

export function RevenueByProductTable({ transactions, products }: RevenueByProductTableProps) {
  const { formatCurrency } = useCurrency();
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadAdjustments = async () => {
      try {
        const productIds = products.map((p) => p.id);
        if (productIds.length === 0) {
          if (isMounted) setAdjustments([]);
          return;
        }

        const rows = await productsAPI.getAdjustments({ productIds }) as InventoryAdjustment[];
        if (isMounted) {
          setAdjustments(rows || []);
        }
      } catch (error) {
        console.error('Failed to load inventory adjustments for analytics:', error);
        if (isMounted) setAdjustments([]);
      }
    };

    loadAdjustments();
    return () => {
      isMounted = false;
    };
  }, [products]);


  const { rangeStart, rangeEnd } = useMemo(() => {
    if (transactions.length === 0) {
      const today = new Date();
      return { rangeStart: today, rangeEnd: today };
    }

    const timestamps = transactions.map((tx) => tx.timestamp.getTime());
    return {
      rangeStart: new Date(Math.min(...timestamps)),
      rangeEnd: new Date(Math.max(...timestamps)),
    };
  }, [transactions]);

  const productData = useMemo(() => {
    const map = new Map<string, { product: Product; unitsSold: number; revenue: number }>();

    transactions.forEach(t => {
      t.items.forEach(item => {
        const existing = map.get(item.product.id) || {
          product: item.product,
          unitsSold: 0,
          revenue: 0
        };

        map.set(item.product.id, {
          product: existing.product,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + (item.product.price * item.quantity)
        });
      });
    });

    const total = Array.from(map.values()).reduce((sum, item) => sum + item.revenue, 0);

    return Array.from(map.values())
      .map(item => {
        const productAdjustments = adjustments.filter((adj) => adj.productId === item.product.id);
        const inStockDays = getInStockDayCount({
          product: item.product,
          adjustments: productAdjustments,
          rangeStart,
          rangeEnd,
        });

        return {
          ...item,
          percentage: total > 0 ? (item.revenue / total) * 100 : 0,
          avgPrice: item.revenue / item.unitsSold,
          inStockDays,
          unitsPerInStockDay: inStockDays > 0 ? item.unitsSold / inStockDays : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [transactions, adjustments, rangeStart, rangeEnd]);

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
                <th className="text-right p-2 text-gray-600">In-stock Days</th>
                <th className="text-right p-2 text-gray-600">Units / In-stock Day</th>
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
                  <td className="p-2 text-right text-gray-700">{item.inStockDays}</td>
                  <td className="p-2 text-right text-gray-700">{item.unitsPerInStockDay.toFixed(2)}</td>
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
