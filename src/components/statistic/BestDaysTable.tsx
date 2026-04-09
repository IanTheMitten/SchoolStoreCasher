import { useMemo } from 'react';
import type { Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { topDaysByRevenue } from './rankingAnalytics';

interface BestDaysTableProps {
  filteredTransactions: Transaction[];
}

export function BestDaysTable({ filteredTransactions }: BestDaysTableProps) {
  const { formatCurrency } = useCurrency();

  const rows = useMemo(() => topDaysByRevenue(filteredTransactions, 10), [filteredTransactions]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Best Days by Revenue</h3>
        <p className="text-sm text-gray-600 mt-1">Top 10 dates by sampled revenue.</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No sampled day data available.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Date</th>
                <th className="text-left p-2 text-gray-600">Weekday</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
                <th className="text-right p-2 text-gray-600">Tx Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.dayKey} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-900">
                    {row.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="p-2 text-gray-700">{row.weekday}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-gray-700">{row.txCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
