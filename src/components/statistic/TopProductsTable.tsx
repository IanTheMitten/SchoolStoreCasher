import { useMemo, useState } from 'react';
import type { Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { getSampledTransactionDates, type StatisticSamplingOptions } from './analyticsSampling';

interface TopProductsTableProps {
  transactions: Transaction[];
  samplingOptions: StatisticSamplingOptions;
}

type SecondarySortMetric = 'none' | 'product' | 'unitsSold' | 'profit' | 'margin';
type SortDirection = 'desc' | 'asc';

interface ProductAggregate {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
}

const toDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function compareByMetric(a: ProductAggregate, b: ProductAggregate, metric: SecondarySortMetric): number {
  switch (metric) {
    case 'product':
      return a.productName.localeCompare(b.productName);
    case 'unitsSold':
      return a.unitsSold - b.unitsSold;
    case 'profit':
      return a.profit - b.profit;
    case 'margin':
      return a.margin - b.margin;
    case 'none':
    default:
      return 0;
  }
}

export function TopProductsTable({ transactions, samplingOptions }: TopProductsTableProps) {
  const { formatCurrency } = useCurrency();
  const [secondarySortMetric, setSecondarySortMetric] = useState<SecondarySortMetric>('none');
  const [secondarySortDirection, setSecondarySortDirection] = useState<SortDirection>('desc');

  const sampledDaySet = useMemo(() => {
    const sampledDates = getSampledTransactionDates(transactions, samplingOptions).selected;
    return new Set(sampledDates.map(toDayKey));
  }, [transactions, samplingOptions]);

  const rows = useMemo(() => {
    const aggregates = new Map<string, ProductAggregate>();

    for (const transaction of transactions) {
      if (!sampledDaySet.has(toDayKey(transaction.timestamp))) {
        continue;
      }

      for (const item of transaction.items) {
        const current = aggregates.get(item.product.id) ?? {
          productId: item.product.id,
          productName: item.product.name,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
          margin: 0,
        };

        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.product.price) || 0;
        const unitCost = Number(item.product.unitCost) || 0;

        current.unitsSold += quantity;
        current.revenue += unitPrice * quantity;
        current.profit += (unitPrice - unitCost) * quantity;

        aggregates.set(item.product.id, current);
      }
    }

    const computedRows = Array.from(aggregates.values()).map((row) => ({
      ...row,
      margin: row.revenue > 0 ? row.profit / row.revenue : 0,
    }));

    return computedRows
      .filter((row) => row.unitsSold > 0 || row.revenue !== 0)
      .sort((a, b) => {
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }

        if (secondarySortMetric !== 'none') {
          const secondaryResult = compareByMetric(a, b, secondarySortMetric);
          if (secondaryResult !== 0) {
            return secondarySortDirection === 'asc' ? secondaryResult : -secondaryResult;
          }
        }

        return a.productName.localeCompare(b.productName);
      });
  }, [transactions, sampledDaySet, secondarySortMetric, secondarySortDirection]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-gray-900">Top Products</h3>
          <p className="text-sm text-gray-600 mt-1">Direct transaction aggregation across sampled days.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Secondary sort
            <select
              value={secondarySortMetric}
              onChange={(event) => setSecondarySortMetric(event.target.value as SecondarySortMetric)}
              className="rounded-md border border-gray-300 px-2 py-1 bg-white text-sm"
            >
              <option value="none">None</option>
              <option value="product">Product</option>
              <option value="unitsSold">Units Sold</option>
              <option value="profit">Profit</option>
              <option value="margin">Margin %</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            Direction
            <select
              value={secondarySortDirection}
              onChange={(event) => setSecondarySortDirection(event.target.value as SortDirection)}
              className="rounded-md border border-gray-300 px-2 py-1 bg-white text-sm"
              disabled={secondarySortMetric === 'none'}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No product sales available for the selected sample.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-right p-2 text-gray-600 w-16">Rank</th>
                <th className="text-left p-2 text-gray-600">Product</th>
                <th className="text-right p-2 text-gray-600">Units Sold</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
                <th className="text-right p-2 text-gray-600">Profit</th>
                <th className="text-right p-2 text-gray-600">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr key={row.productId} className="hover:bg-gray-50">
                  <td className="p-2 text-right text-gray-700">{index + 1}</td>
                  <td className="p-2 text-gray-900">{row.productName}</td>
                  <td className="p-2 text-right text-gray-900">{row.unitsSold}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.profit)}</td>
                  <td className="p-2 text-right text-gray-900">{(row.margin * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
