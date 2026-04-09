import { useMemo, useState } from 'react';
import type { Product, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';

interface TopProductsTableProps {
  transactions: Transaction[];
  products: Product[];
}

type SecondarySortField = 'none' | 'unitsSold' | 'profit' | 'marginPct' | 'name';
type SecondarySortDirection = 'asc' | 'desc';

interface ProductAggregateRow {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPct: number;
}

export function TopProductsTable({ transactions, products }: TopProductsTableProps) {
  const { formatCurrency } = useCurrency();
  const [secondarySortField, setSecondarySortField] = useState<SecondarySortField>('none');
  const [secondarySortDirection, setSecondarySortDirection] = useState<SecondarySortDirection>('desc');

  const productNameById = useMemo(() => {
    const nameMap = new Map<string, string>();
    products.forEach((product) => {
      nameMap.set(product.id, product.name);
    });
    return nameMap;
  }, [products]);

  const rows = useMemo(() => {
    const aggregates = new Map<string, ProductAggregateRow>();

    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const unitPrice = Number(item.product.price || 0);
        const unitCost = Number(item.product.unitCost || 0);
        const quantity = Number(item.quantity || 0);
        const lineRevenue = unitPrice * quantity;
        const lineProfit = (unitPrice - unitCost) * quantity;

        const existing = aggregates.get(item.product.id) ?? {
          productId: item.product.id,
          productName: productNameById.get(item.product.id) ?? item.product.name,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
          marginPct: 0,
        };

        existing.unitsSold += quantity;
        existing.revenue += lineRevenue;
        existing.profit += lineProfit;
        aggregates.set(item.product.id, existing);
      });
    });

    const computedRows = Array.from(aggregates.values()).map((row) => ({
      ...row,
      marginPct: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
    }));

    const secondaryMultiplier = secondarySortDirection === 'asc' ? 1 : -1;

    return computedRows.sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }

      if (secondarySortField !== 'none') {
        if (secondarySortField === 'name') {
          const byName = a.productName.localeCompare(b.productName);
          if (byName !== 0) {
            return byName * secondaryMultiplier;
          }
        } else {
          const bySecondary = (a[secondarySortField] - b[secondarySortField]) * secondaryMultiplier;
          if (bySecondary !== 0) {
            return bySecondary;
          }
        }
      }

      return a.productName.localeCompare(b.productName);
    });
  }, [transactions, productNameById, secondarySortField, secondarySortDirection]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-gray-900">Top Products</h3>
          <p className="text-sm text-gray-600 mt-1">Direct transaction aggregation with revenue-first ranking.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="flex flex-col text-xs text-gray-600 gap-1">
            Secondary Sort
            <select
              value={secondarySortField}
              onChange={(event) => setSecondarySortField(event.target.value as SecondarySortField)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
            >
              <option value="none">None</option>
              <option value="unitsSold">Units Sold</option>
              <option value="profit">Profit</option>
              <option value="marginPct">Margin %</option>
              <option value="name">Product Name</option>
            </select>
          </label>

          <label className="flex flex-col text-xs text-gray-600 gap-1">
            Direction
            <select
              value={secondarySortDirection}
              onChange={(event) => setSecondarySortDirection(event.target.value as SecondarySortDirection)}
              disabled={secondarySortField === 'none'}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 disabled:opacity-50"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No product transactions available.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Rank</th>
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
                  <td className="p-2 text-gray-700">{index + 1}</td>
                  <td className="p-2 text-gray-900">{row.productName}</td>
                  <td className="p-2 text-right text-gray-900">{row.unitsSold}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.profit)}</td>
                  <td className="p-2 text-right text-gray-900">{row.marginPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
