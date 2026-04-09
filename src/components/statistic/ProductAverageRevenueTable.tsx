import { useEffect, useMemo, useState } from 'react';
import type { Product, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { productsAPI } from '../../services/api';
import { Card } from '../ui/card';
import { getSampledTransactionDates, type StatisticSamplingOptions } from './analyticsSampling';

interface ProductAverageRevenueTableProps {
  transactions: Transaction[];
  products: Product[];
  samplingOptions: StatisticSamplingOptions;
}

interface InventoryAdjustment {
  id: string;
  productId: string;
  date: string;
  quantity: number;
}

interface ProductRevenueRow {
  product: Product;
  sampledRevenue: number;
  eligibleDays: number;
  avgRevenuePerEligibleDay: number;
}

const TOP_LIMIT = 10;

const toDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const endOfDay = (date: Date): Date => {
  const normalized = startOfDay(date);
  normalized.setDate(normalized.getDate() + 1);
  return normalized;
};

function isZeroForEntireDay(stockAtDayStart: number, dayAdjustments: InventoryAdjustment[]): boolean {
  if (stockAtDayStart > 0) {
    return false;
  }

  const sorted = [...dayAdjustments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let runningStock = stockAtDayStart;
  for (const adjustment of sorted) {
    runningStock += Number(adjustment.quantity || 0);
    if (runningStock > 0) {
      return false;
    }
  }

  return true;
}

function getEligibleDaysForProduct({
  product,
  adjustments,
  sampledDayKeys,
}: {
  product: Product;
  adjustments: InventoryAdjustment[];
  sampledDayKeys: string[];
}): number {
  if (sampledDayKeys.length === 0) {
    return 0;
  }

  const sampledDates = sampledDayKeys.map((dayKey) => startOfDay(new Date(dayKey)));
  const rangeStart = sampledDates[0];
  const rangeEnd = sampledDates[sampledDates.length - 1];

  const stockNow = Number(product.stock || 0);

  const rangeStartMs = rangeStart.getTime();
  const afterRangeStart = adjustments.filter((adjustment) => new Date(adjustment.date).getTime() >= rangeStartMs);

  const stockAtRangeStart = afterRangeStart.reduce(
    (runningStock, adjustment) => runningStock - Number(adjustment.quantity || 0),
    stockNow,
  );

  const dayAdjustments = new Map<string, InventoryAdjustment[]>();
  for (const adjustment of adjustments) {
    const adjustmentDate = new Date(adjustment.date);
    if (adjustmentDate < rangeStart || adjustmentDate >= endOfDay(rangeEnd)) {
      continue;
    }

    const dayKey = toDayKey(adjustmentDate);
    const existing = dayAdjustments.get(dayKey) ?? [];
    existing.push(adjustment);
    dayAdjustments.set(dayKey, existing);
  }

  const stockAtDayStart = new Map<string, number>();
  let runningStock = stockAtRangeStart;

  for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
    const dayKey = toDayKey(cursor);
    stockAtDayStart.set(dayKey, runningStock);

    const deltas = dayAdjustments.get(dayKey) ?? [];
    for (const delta of deltas) {
      runningStock += Number(delta.quantity || 0);
    }
  }

  return sampledDayKeys.reduce((count, dayKey) => {
    const dayStartStock = stockAtDayStart.get(dayKey) ?? 0;
    const fullDayZero = isZeroForEntireDay(dayStartStock, dayAdjustments.get(dayKey) ?? []);
    return fullDayZero ? count : count + 1;
  }, 0);
}

export function ProductAverageRevenueTable({ transactions, products, samplingOptions }: ProductAverageRevenueTableProps) {
  const { formatCurrency } = useCurrency();
  const [showAll, setShowAll] = useState(false);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadAdjustments = async () => {
      try {
        if (products.length === 0) {
          if (isMounted) {
            setAdjustments([]);
          }
          return;
        }

        const productIds = products.map((product) => product.id);
        const rows = await productsAPI.getAdjustments({ productIds }) as InventoryAdjustment[];
        if (isMounted) {
          setAdjustments(rows || []);
        }
      } catch (error) {
        console.error('Failed to load inventory adjustments for product average revenue:', error);
        if (isMounted) {
          setAdjustments([]);
        }
      }
    };

    loadAdjustments();

    return () => {
      isMounted = false;
    };
  }, [products]);

  const sampledDayKeys = useMemo(() => {
    const sampledDates = getSampledTransactionDates(transactions, samplingOptions).selected;
    const uniqueDayKeys = new Set(sampledDates.map(toDayKey));
    return Array.from(uniqueDayKeys).sort();
  }, [transactions, samplingOptions]);

  const sampledDaySet = useMemo(() => new Set(sampledDayKeys), [sampledDayKeys]);

  const rows = useMemo(() => {
    const productRevenueOnSampledDays = new Map<string, number>();

    for (const transaction of transactions) {
      const dayKey = toDayKey(transaction.timestamp);
      if (!sampledDaySet.has(dayKey)) {
        continue;
      }

      for (const item of transaction.items) {
        const runningTotal = productRevenueOnSampledDays.get(item.product.id) ?? 0;
        productRevenueOnSampledDays.set(
          item.product.id,
          runningTotal + (item.product.price * item.quantity),
        );
      }
    }

    const adjustmentsByProduct = new Map<string, InventoryAdjustment[]>();
    for (const adjustment of adjustments) {
      const existing = adjustmentsByProduct.get(adjustment.productId) ?? [];
      existing.push(adjustment);
      adjustmentsByProduct.set(adjustment.productId, existing);
    }

    const computedRows: ProductRevenueRow[] = products.map((product) => {
      const sampledRevenue = productRevenueOnSampledDays.get(product.id) ?? 0;
      const eligibleDaysForProduct = getEligibleDaysForProduct({
        product,
        adjustments: adjustmentsByProduct.get(product.id) ?? [],
        sampledDayKeys,
      });

      return {
        product,
        sampledRevenue,
        eligibleDays: eligibleDaysForProduct,
        avgRevenuePerEligibleDay:
          eligibleDaysForProduct > 0 ? sampledRevenue / eligibleDaysForProduct : 0,
      };
    });

    return computedRows
      .filter((row) => row.sampledRevenue > 0 || row.eligibleDays > 0)
      .sort((a, b) => {
        if (b.avgRevenuePerEligibleDay !== a.avgRevenuePerEligibleDay) {
          return b.avgRevenuePerEligibleDay - a.avgRevenuePerEligibleDay;
        }

        return b.sampledRevenue - a.sampledRevenue;
      });
  }, [transactions, sampledDaySet, adjustments, products, sampledDayKeys]);

  const visibleRows = showAll ? rows : rows.slice(0, TOP_LIMIT);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-gray-900">Average Revenue per Eligible Day by Product</h3>
          <p className="text-sm text-gray-600 mt-1">
            Sampled weekdays with transactions only. Days fully out of stock are excluded per product.
          </p>
        </div>

        {rows.length > TOP_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showAll ? 'Show top 10' : 'Show all'}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No sampled product revenue available.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Product</th>
                <th className="text-right p-2 text-gray-600">Revenue (sampled days)</th>
                <th className="text-right p-2 text-gray-600">Eligible Days</th>
                <th className="text-right p-2 text-gray-600">Avg Revenue / Eligible Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleRows.map((row) => (
                <tr key={row.product.id} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-900">{row.product.name}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.sampledRevenue)}</td>
                  <td className="p-2 text-right text-gray-700">{row.eligibleDays}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.avgRevenuePerEligibleDay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
