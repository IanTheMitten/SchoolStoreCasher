import { Button } from './ui/button';
import { Printer, ShoppingBag } from 'lucide-react';
import type { Sale } from '../App';

interface ReceiptProps {
  sale: Sale;
  onNewSale: () => void;
}

export function Receipt({ sale, onNewSale }: ReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const formatKRW = (amount: number) => {
    try {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(amount));
    } catch (e) {
      return `₩${Math.round(amount)}`;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'bank': return 'Bank Transfer';
      default: return method;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8 print:border-0 print:shadow-none">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <div className="inline-flex items-center justify-center size-16 bg-blue-100 rounded-full mb-4">
              <ShoppingBag className="size-8 text-blue-600" />
            </div>
            <h1 className="text-gray-900 mb-2">School Store Receipt</h1>
            <p className="text-gray-600">Sale #{sale.id}</p>
          </div>

          {/* Sale Info */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-gray-900 mb-2">Student Information</h2>
              <div className="space-y-1 text-gray-600">
                <p>{sale.student.name}</p>
                <p>{sale.student.grade}</p>
                <p>{sale.student.gender}</p>
              </div>
            </div>

            <div>
              <h2 className="text-gray-900 mb-2">Sale Details</h2>
              <div className="space-y-1 text-gray-600">
                <p>Date: {formatDate(sale.timestamp)}</p>
                <p>Payment: {getPaymentMethodLabel(sale.paymentMethod)}</p>
                {sale.note && <p>Note: {sale.note}</p>}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h2 className="text-gray-900 mb-4">Items Purchased</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-gray-600">Item</th>
                    <th className="text-right p-3 text-gray-600">Qty</th>
                    <th className="text-right p-3 text-gray-600">Price</th>
                    <th className="text-right p-3 text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map(item => (
                    <tr key={item.product.id}>
                      <td className="p-3">
                        <div className="text-gray-900">{item.product.name}</div>
                        {item.product.description && (
                          <div className="text-gray-500 text-sm">{item.product.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-600">{formatKRW(item.product.price)}</td>
                      <td className="p-3 text-right text-gray-900">
                        {formatKRW(item.product.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-gray-900">
                      Total
                    </td>
                    <td className="p-3 text-right text-gray-900">
                      {formatKRW(sale.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="size-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={onNewSale} className="flex-1">
              <ShoppingBag className="size-4 mr-2" />
              New Sale
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
            Thank you for your purchase!
          </div>
        </div>
      </div>
    </div>
  );
}
