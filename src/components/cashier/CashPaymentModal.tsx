import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import type { CartItem, Transaction, Student } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { roundMoney } from '../../utils/formatCurrency';

interface CustomerOption {
  id: string;
  name: string;
  type: 'student' | 'teacher';
  detail?: string;
  group: string;
}

interface Teacher {
  id: string;
  name: string;
  subject?: string;
  email?: string;
}

interface CashPaymentModalProps {
  total: number;
  subtotal: number;
  tax: number;
  cart: CartItem[];
  students?: Student[];
  teachers?: any[];
  onComplete: (transaction: Transaction) => void;
  onClose: () => void;
}

export function CashPaymentModal({
  total,
  subtotal,
  tax,
  cart,
  students = [],
  teachers = [],
  onComplete,
  onClose
}: CashPaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [studentBarcodeScan, setStudentBarcodeScan] = useState('');
  const [customerGroupFilter, setCustomerGroupFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const change = roundMoney((cashReceived || 0) - total);
  const normalizedSearch = customerSearch.trim().toLowerCase();
  const sortedGrades = Array.from(
    new Set((students || []).map((student) => student.grade).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const customerOptions: CustomerOption[] = [
    ...(students || []).map((student) => ({
      id: student.id,
      name: student.name,
      type: 'student' as const,
      detail: student.grade,
      group: student.grade || 'Ungrouped',
    })),
    ...(teachers as Teacher[] || []).map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      type: 'teacher' as const,
      detail: teacher.subject || teacher.email || 'Teacher',
      group: 'Teachers',
    })),
  ];
  const filteredCustomers = customerOptions.filter(
    (customer) =>
      (
        customerGroupFilter === 'all' ||
        (customerGroupFilter === 'teachers' && customer.type === 'teacher') ||
        (customerGroupFilter.startsWith('grade:') && customer.type === 'student' && customer.group === customerGroupFilter.slice(6))
      ) &&
      (
        !normalizedSearch ||
        customer.name.toLowerCase().includes(normalizedSearch) ||
        customer.id.toLowerCase().includes(normalizedSearch) ||
        (customer.detail || '').toLowerCase().includes(normalizedSearch)
      )
  );
  const studentRecords = (students || []) as Array<Student & { barcode?: string }>;

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
    if (!selectedCustomer) {
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
      studentId: selectedCustomer.id
    };

    onComplete(transaction);
  };

  const handleStudentBarcodeMatch = (scannedValue: string) => {
    const normalizedBarcode = scannedValue.trim().toLowerCase();
    if (!normalizedBarcode) {
      return;
    }

    const matchedStudents = studentRecords.filter(
      (student) => (student.barcode || '').trim().toLowerCase() === normalizedBarcode
    );

    if (matchedStudents.length === 1) {
      const matchedStudent = matchedStudents[0];
      setSelectedCustomer({
        id: matchedStudent.id,
        name: matchedStudent.name,
        type: 'student',
        detail: matchedStudent.grade,
        group: matchedStudent.grade || 'Ungrouped',
      });
      setShowCustomerSelector(false);
      setStudentBarcodeScan('');
      return;
    }

    if (matchedStudents.length > 1) {
      toast.error(
        'Duplicate student barcode detected. Admin cleanup is required before checkout can continue.'
      );
      return;
    }

    toast.error('Student barcode not found');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Associate Customer */}
          <div>
            <Button variant="ghost" onClick={() => setShowCustomerSelector(v => !v)}>
              {selectedCustomer
                ? `Associated: ${selectedCustomer.name} (${selectedCustomer.type})`
                : 'Associate with Customer'}
            </Button>
            {showCustomerSelector && (
              <div className="mt-2 rounded border bg-white p-2">
                <div className="mb-2">
                  <Input
                    placeholder="Scan student ID barcode..."
                    value={studentBarcodeScan}
                    onChange={(e) => setStudentBarcodeScan((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleStudentBarcodeMatch(studentBarcodeScan);
                      }
                    }}
                  />
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div className="mb-2">
                  <Select value={customerGroupFilter} onValueChange={setCustomerGroupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="teachers">Teachers</SelectItem>
                      {sortedGrades.map((grade) => (
                        <SelectItem key={grade} value={`grade:${grade}`}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-64 overflow-y-auto overscroll-contain border rounded">
                  {filteredCustomers.map(customer => (
                    <button
                      key={`${customer.type}-${customer.id}`}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerSelector(false);
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50"
                    >
                      <div>
                        <div className="text-gray-900">{customer.name}</div>
                        <div className="text-gray-500 text-sm">
                          {customer.detail || '—'} • {customer.type}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No customers found.</div>
                  )}
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
              disabled={!selectedCustomer || !cashReceived || change < 0}
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
