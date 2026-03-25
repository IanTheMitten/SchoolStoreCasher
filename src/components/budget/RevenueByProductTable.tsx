import { useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction, Product, StockAdjustment } from '../../App';

interface RevenueByProductTableProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  products: Product[];
  stockAdjustments: StockAdjustment[];
}

interface StockEvent {
  timestamp: number;
  delta: number;
}

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function getDayBounds(dayKey: string): { start: number; end: number } {
  const [year, month, day] = dayKey.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start: startDate.getTime(), end: endDate.getTime() };
}

function computeEligibleDaysForProduct(
  sampledDayKeys: string[],
  currentStock: number,
  productEvents: StockEvent[]
): number {
  if (sampledDayKeys.length === 0) {
    return 0;
  }

  const sortedEventsAsc = [...productEvents].sort((a, b) => a.timestamp - b.timestamp);
  const totalDelta = sortedEventsAsc.reduce((sum, event) => sum + event.delta, 0);
  let stockAtRangeStart = currentStock - totalDelta;

  let eligibleDays = 0;
  let eventIndex = 0;

  for (const dayKey of sampledDayKeys) {
    const { start, end } = getDayBounds(dayKey);

    while (eventIndex < sortedEventsAsc.length && sortedEventsAsc[eventIndex].timestamp < start) {
      stockAtRangeStart += sortedEventsAsc[eventIndex].delta;
      eventIndex += 1;
    }

    let stockDuringDay = stockAtRangeStart;
    let dayHasStock = stockDuringDay > 0;

    let dayEventIndex = eventIndex;
    while (dayEventIndex < sortedEventsAsc.length && sortedEventsAsc[dayEventIndex].timestamp <= end) {
      stockDuringDay += sortedEventsAsc[dayEventIndex].delta;
      if (stockDuringDay > 0) {
        dayHasStock = true;
      }
      dayEventIndex += 1;
    }

    if (dayHasStock) {
      eligibleDays += 1;
    }

    while (eventIndex < dayEventIndex) {
      stockAtRangeStart += sortedEventsAsc[eventIndex].delta;
      eventIndex += 1;
    }
  }

  return eligibleDays;
}

export function RevenueByProductTable({ transactions, allTransactions, products, stockAdjustments }: RevenueByProductTableProps) {
  const { formatCurrency } = useCurrency();
  const [showAll, setShowAll] = useState(false);

  const productData = useMemo(() => {
    const sampledDaySet = new Set<string>();
    transactions.forEach((transaction) => {
      if (isWeekday(transaction.timestamp)) {
        sampledDaySet.add(toDayKey(transaction.timestamp));
      }
    });

    const sampledDayKeys = Array.from(sampledDaySet).sort();

    const revenueByProduct = new Map<string, { product: Product; unitsSold: number; revenue: number }>();
    transactions.forEach((transaction) => {
      if (!isWeekday(transaction.timestamp)) {
        return;
      }

      transaction.items.forEach((item) => {
        const existing = revenueByProduct.get(item.product.id) || {
          product: item.product,
          unitsSold: 0,
          revenue: 0,
        };

        revenueByProduct.set(item.product.id, {
          product: item.product,
          unitsSold: existing.unitsSold + item.quantity,
          revenue: existing.revenue + item.product.price * item.quantity,
        });
      });
    });

    const stockEventsByProduct = new Map<string, StockEvent[]>();

    allTransactions.forEach((transaction) => {
      const timestamp = transaction.timestamp.getTime();
      transaction.items.forEach((item) => {
        const existing = stockEventsByProduct.get(item.product.id) ?? [];
        existing.push({
          timestamp,
          delta: -item.quantity,
        });
        stockEventsByProduct.set(item.product.id, existing);
      });
    });

    stockAdjustments.forEach((adjustment) => {
      const existing = stockEventsByProduct.get(adjustment.productId) ?? [];
      existing.push({
        timestamp: new Date(adjustment.date).getTime(),
        delta: adjustment.quantity,
      });
      stockEventsByProduct.set(adjustment.productId, existing);
    });

    const productById = new Map(products.map((product) => [product.id, product]));
    const aggregateRevenue = Array.from(revenueByProduct.values()).reduce((sum, item) => sum + item.revenue, 0);

    return Array.from(revenueByProduct.entries())
      .map(([productId, item]) => {
        const productSnapshot = productById.get(productId);
        const eligibleDays = computeEligibleDaysForProduct(
          sampledDayKeys,
          productSnapshot?.stock ?? item.product.stock ?? 0,
          stockEventsByProduct.get(productId) ?? []
        );
        const averageRevenuePerEligibleDay = eligibleDays > 0 ? item.revenue / eligibleDays : 0;

        return {
          ...item,
          eligibleDays,
          averageRevenuePerEligibleDay,
          percentage: aggregateRevenue > 0 ? (item.revenue / aggregateRevenue) * 100 : 0,
          avgPrice: item.unitsSold > 0 ? item.revenue / item.unitsSold : 0,
        };
      })
      .sort((a, b) => b.averageRevenuePerEligibleDay - a.averageRevenuePerEligibleDay);
  }, [allTransactions, products, stockAdjustments, transactions]);

  const visibleRows = showAll ? productData : productData.slice(0, 10);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-gray-900">Revenue by Product (Avg / Eligible Day)</h3>
        {productData.length > 10 && (
          <Button variant="outline" size="sm" onClick={() => setShowAll((prev) => !prev)}>
            {showAll ? 'Show top 10' : 'Show all'}
          </Button>
        )}
      </div>

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
                <th className="text-right p-2 text-gray-600">Eligible Days</th>
                <th className="text-right p-2 text-gray-600">Avg Revenue / Day</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
                <th className="text-right p-2 text-gray-600">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleRows.map((item) => (
                <tr key={item.product.id} className="hover:bg-gray-50">
                  <td className="p-2">
                    <div className="text-gray-900">{item.product.name}</div>
                    <div className="text-gray-500 text-xs">
                      Units: {item.unitsSold} • Avg unit: {formatCurrency(item.avgPrice)}
                    </div>
                  </td>
                  <td className="p-2 text-right text-gray-900">{item.eligibleDays}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(item.averageRevenuePerEligibleDay)}</td>
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
