import { useMemo } from 'react';
import type { Student, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { topCustomers } from './aggregation';

interface TopCustomersTableProps {
  filteredTransactions: Transaction[];
  students: Student[];
}

export function TopCustomersTable({ filteredTransactions, students }: TopCustomersTableProps) {
  const { formatCurrency } = useCurrency();
  const rows = useMemo(() => topCustomers(filteredTransactions, students, 10), [filteredTransactions, students]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Top Customers</h3>
        <p className="text-sm text-gray-600 mt-1">Top 10 customers by spend in the selected range.</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No customer-linked transactions available.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Customer</th>
                <th className="text-left p-2 text-gray-600">Type</th>
                <th className="text-left p-2 text-gray-600">Grade</th>
                <th className="text-right p-2 text-gray-600">Spend</th>
                <th className="text-right p-2 text-gray-600">Visits</th>
                <th className="text-right p-2 text-gray-600">Avg Spend/Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.customerKey} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-900">{row.customerName}</td>
                  <td className="p-2 text-gray-900 capitalize">{row.customerType}</td>
                  <td className="p-2 text-gray-900">{row.customerType === 'student' ? (row.grade || '—') : '—'}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-gray-900">{row.visits}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.avgSpendPerVisit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
