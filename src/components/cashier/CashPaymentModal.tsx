import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import type { CartItem, Transaction, Student } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { roundMoney } from '../../utils/formatCurrency';

interface CashPaymentModalProps {
  total: number;
  subtotal: number;
  tax: number;
  cart: CartItem[];
  students?: Student[];
  onComplete: (transaction: Transaction) => void;
  onClose: () => void;
}

export function CashPaymentModal({
  total,
  subtotal,
  tax,
  cart,
  students = [],
  onComplete,
  onClose
}: CashPaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const change = roundMoney((cashReceived || 0) - total);

  const quickAmounts = [
    { label: 'Exact', value: total, accumulate: false },
    { label: '₩50', value: 50 },
    { label: '₩100', value: 100 },
    { label: '₩500', value: 500 },
    { label: '₩1,000', value: 1000 },
    { label: '₩5,000', value: 5000 },
    { label: '₩10,000', value: 10000 },
    { label: '₩50,000', value: 50000 }
  ];

  // Use shared formatter

  const handleQuickAmount = (amount: number, accumulate = true) => {
    if (accumulate) {
      setCashReceived((prev) => roundMoney((prev || 0) + amount));
    } else {
      setCashReceived(amount);
    }
  };

  const handleComplete = () => {
    const received = cashReceived || 0;
    if (!selectedStudent) {
      alert('Please associate the sale with a customer before completing the transaction.');
      return;
    }
    const receivedRounded = roundMoney(received);
    const totalRounded = roundMoney(total);
    if (isNaN(received) || receivedRounded < totalRounded) {
      return;
    }

    const transaction: Transaction = {
      id: `TXN-${Date.now()}`,
      timestamp: new Date(),
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod: 'cash',
      cashReceived: receivedRounded,
      change: roundMoney(received - total),
      studentId: selectedStudent.id
    };

    onComplete(transaction);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cash Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-gray-600 text-sm">Amount Due</div>
            <div className="text-gray-900">{formatCurrency(total)}</div>
          </div>

          {/* Quick Amounts */}
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((quick) => (
              <Button
                key={quick.label}
                variant="outline"
                onClick={() => handleQuickAmount(quick.value, (quick as any).accumulate !== false)}
                className="h-12"
              >
                {quick.label}
              </Button>
            ))}
          </div>

          {/* Cash Received Display */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="text-blue-600 text-sm mb-1">Cash Received</div>
            <div className="text-blue-900 text-center">
              {formatCurrency(cashReceived || 0)}
            </div>
          </div>

          {/* Change */}
          {cashReceived && change >= 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="text-green-600 text-sm mb-1">Change</div>
              <div className="text-green-900 text-center">
                {formatCurrency(change)}
              </div>
            </div>
          )}

          {cashReceived && change < 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
              Insufficient cash received
            </div>
          )}

          {/* Associate Student */}
          <div>
            <Button variant="ghost" onClick={() => setShowStudentSelector(v => !v)}>
              {selectedStudent ? `Associated: ${selectedStudent.name}` : 'Associate with Customer'}
            </Button>
            {showStudentSelector && (
              <div className="mt-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Search student..." value={studentSearch} onChange={(e) => setStudentSearch((e.target as HTMLInputElement).value)} />
                </div>
                <div className="max-h-40 overflow-auto border rounded">
                  {(students || []).filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                    <button key={s.id} onClick={() => { setSelectedStudent(s); setShowStudentSelector(false); }} className="w-full text-left p-2 hover:bg-gray-50"> 
                      <div>
                        <div className="text-gray-900">{s.name}</div>
                        <div className="text-gray-500 text-sm">{s.grade}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Complete Button */}
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!selectedStudent || !cashReceived || change < 0}
              className="flex-1"
            >
              Complete Sale
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
