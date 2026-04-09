import { useMemo } from 'react';
import type { Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { topDaysByRevenue } from './aggregation';

interface BestDaysTableProps {
  transactions: Transaction[];
}

function formatDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) {
    return dayKey;
  }

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BestDaysTable({ transactions }: BestDaysTableProps) {
  const { formatCurrency } = useCurrency();
  const rows = useMemo(() => topDaysByRevenue(transactions, 10), [transactions]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Best Days</h3>
        <p className="text-sm text-gray-600 mt-1">Highest revenue dates in the selected range.</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No transactions available for day ranking.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Rank</th>
                <th className="text-left p-2 text-gray-600">Date</th>
                <th className="text-right p-2 text-gray-600">Transactions</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr key={row.dayKey} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-700">{index + 1}</td>
                  <td className="p-2 text-gray-900">{formatDayKey(row.dayKey)}</td>
                  <td className="p-2 text-right text-gray-900">{row.txCount}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
