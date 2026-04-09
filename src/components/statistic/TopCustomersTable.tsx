import { useMemo } from 'react';
import type { Student, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { topCustomers } from './aggregation';

interface TopCustomersTableProps {
  transactions: Transaction[];
  students: Student[];
}

export function TopCustomersTable({ transactions, students }: TopCustomersTableProps) {
  const { formatCurrency } = useCurrency();
  const rows = useMemo(() => topCustomers(transactions, students, 10), [transactions, students]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Top Customers</h3>
        <p className="text-sm text-gray-600 mt-1">Students ranked by revenue in the selected range.</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No customer-linked transactions available.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Rank</th>
                <th className="text-left p-2 text-gray-600">Customer</th>
                <th className="text-right p-2 text-gray-600">Transactions</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr key={row.studentId} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-700">{index + 1}</td>
                  <td className="p-2 text-gray-900">{row.studentName}</td>
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
