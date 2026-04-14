import { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction, Student } from '../../App';

interface TransactionsTableProps {
  transactions: Transaction[];
  students?: Student[];
  teachers?: any[];
}

export function TransactionsTable({ transactions, students = [], teachers = [] }: TransactionsTableProps) {
  const { formatCurrency } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'student_id': return 'Student ID';
      default: return method;
    }
  };

  if (transactions.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-gray-900 mb-4">Transactions</h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No transactions for selected period
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900">Transactions ({transactions.length})</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-4 mr-2" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="size-4 mr-2" />
              Expand
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 text-gray-600">ID</th>
                <th className="text-left p-3 text-gray-600">Date & Time</th>
                <th className="text-left p-3 text-gray-600">Customer</th>
                <th className="text-left p-3 text-gray-600">Payment</th>
                <th className="text-right p-3 text-gray-600">Total</th>
                <th className="text-center p-3 text-gray-600">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.slice().reverse().map(tx => (
                <Fragment key={tx.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  >
                    <td className="p-3 text-gray-600">{tx.id}</td>
                    <td className="p-3 text-gray-900">{formatDateTime(tx.timestamp)}</td>
                    <td className="p-3">
                      {tx.customerId ? (
                        (() => {
                          const isStudent = tx.customerType === 'student';
                          if (isStudent) {
                            const student = students.find(s => s.id === tx.customerId);
                            if (student) {
                              return (
                                <div>
                                  <div className="text-gray-900 text-sm">{student.name}</div>
                                  <div className="text-gray-500 text-xs">{student.grade}</div>
                                </div>
                              );
                            }
                          }

                          const teacher = teachers.find(t => t.id === tx.customerId);
                          if (teacher) {
                            return (
                              <div>
                                <div className="text-gray-900 text-sm">{teacher.name}</div>
                                <div className="text-gray-500 text-xs">Teacher</div>
                              </div>
                            );
                          }
                          return <span className="text-gray-500 text-sm">Customer ID: {tx.customerId}</span>;
                        })()
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{getPaymentMethodLabel(tx.paymentMethod)}</Badge>
                    </td>
                    <td className="p-3 text-right text-gray-900">{formatCurrency(tx.total)}</td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTx(expandedTx === tx.id ? null : tx.id);
                        }}
                      >
                        {expandedTx === tx.id ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  
                  {expandedTx === tx.id && (
                    <tr>
                      <td colSpan={6} className="p-3 bg-gray-50">
                        <div className="space-y-2">
                          <div className="text-gray-600 text-xs mb-2">Items:</div>
                          {tx.items.map((item, idx) => (
                            <div
                              key={`${item.product.id}-${idx}`}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-gray-900">
                                {item.product.name || item.product.id} × {item.quantity}
                              </span>
                              <span className="text-gray-600">
                                {formatCurrency(item.product.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
