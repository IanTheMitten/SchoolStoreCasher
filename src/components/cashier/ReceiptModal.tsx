import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, Download, X } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  const { formatCurrency } = useCurrency();
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptData = JSON.stringify(transaction, null, 2);
    const blob = new Blob([receiptData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center pb-4 border-b border-gray-200">
            <h2 className="text-gray-900 mb-1">School Store</h2>
            <p className="text-gray-600 text-sm">Transaction Receipt</p>
          </div>

          {/* Transaction Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Transaction ID</span>
              <span className="text-gray-900">{transaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time</span>
              <span className="text-gray-900">{formatTime(transaction.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method</span>
              <span className="text-gray-900">{getPaymentMethodLabel(transaction.paymentMethod)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-gray-600 text-sm mb-3">Items Purchased</div>
            <div className="space-y-2">
              {transaction.items.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="text-gray-900">{item.product.name}</div>
                    <div className="text-gray-500 text-xs">
                      {item.quantity} × {formatCurrency(item.product.price)}
                    </div>
                  </div>
                  <div className="text-gray-900">
                    {formatCurrency(item.quantity * item.product.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(transaction.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(transaction.total)}</span>
            </div>

            {transaction.paymentMethod === 'cash' && transaction.cashReceived && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Received</span>
                  <span>{formatCurrency(transaction.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Change</span>
                  <span>{formatCurrency(transaction.change || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handlePrint} className="flex-1">
              <Printer className="size-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload} className="flex-1">
              <Download className="size-4 mr-2" />
              Download
            </Button>
          </div>

          <Button onClick={onClose} className="w-full">
            <X className="size-4 mr-2" />
            Close & New Transaction
          </Button>

          {/* Footer */}
          <div className="text-center text-gray-500 text-xs pt-4 border-t border-gray-200">
            Thank you for your purchase!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
