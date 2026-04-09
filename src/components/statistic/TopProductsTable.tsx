import { useMemo, useState } from 'react';
import type { Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { topProducts } from './aggregation';

interface TopProductsTableProps {
  transactions: Transaction[];
}

const TOP_LIMIT = 10;

export function TopProductsTable({ transactions }: TopProductsTableProps) {
  const { formatCurrency } = useCurrency();
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => topProducts(transactions, showAll ? 999 : TOP_LIMIT), [transactions, showAll]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-gray-900">Top Products</h3>
          <p className="text-sm text-gray-600 mt-1">Ranked by revenue with unit, profit, and margin details.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {showAll ? 'Show top 10' : 'Show all'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No product sales in this date range.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">#</th>
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
                  <td className="p-2 text-gray-600">{index + 1}</td>
                  <td className="p-2 text-gray-900">{row.name}</td>
                  <td className="p-2 text-right text-gray-700">{row.unitsSold}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.profit)}</td>
                  <td className="p-2 text-right text-gray-700">{row.marginPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
