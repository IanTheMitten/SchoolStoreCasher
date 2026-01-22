import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { AddExpenseModal } from './AddExpenseModal';
import type { Expense, Product } from '../../App';
import { formatKRW } from '../../utils/formatCurrency';

interface ExpensesTableProps {
  expenses: Expense[];
  products: Product[];
  onAddExpense: (expense: Expense) => void;
}

export function ExpensesTable({ expenses, products, onAddExpense }: ExpensesTableProps) {
  const [showModal, setShowModal] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Expenses</h3>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="size-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No expenses recorded for selected period
          </div>
        ) : (
          <>
            <div className="overflow-auto max-h-[300px] mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-gray-600">Date</th>
                    <th className="text-left p-2 text-gray-600">Category</th>
                    <th className="text-right p-2 text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="p-2 text-gray-600">{formatDate(expense.date)}</td>
                      <td className="p-2">
                        <div className="text-gray-900">{expense.category}</div>
                        {expense.note && (
                          <div className="text-gray-500 text-xs truncate">{expense.note}</div>
                        )}
                      </td>
                      <td className="p-2 text-right text-gray-900">{formatKRW(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-gray-600 text-sm">Total Expenses</span>
              <span className="text-gray-900">{formatKRW(total)}</span>
            </div>
          </>
        )}
      </Card>

      {showModal && (
        <AddExpenseModal
          products={products}
          onAdd={(expense) => {
            onAddExpense(expense);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
