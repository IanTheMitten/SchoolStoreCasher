import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import type { CartItem, Transaction, Student, Teacher } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useScanner } from '../../contexts/ScannerContext';

interface CustomerOption {
  id: string;
  name: string;
  type: 'student' | 'teacher' | 'grade';
  detail?: string;
  group: string;
}

interface CashPaymentModalProps {
  total: number;
  subtotal: number;
  tax: number;
  cart: CartItem[];
  students?: Student[];
  teachers?: Teacher[];
  onComplete: (transaction: Transaction) => Promise<void> | void;
  onClose: () => void;
}

const studentOption = (student: Student): CustomerOption => ({
  id: student.id,
  name: student.name,
  type: 'student',
  detail: student.grade,
  group: student.grade || 'Ungrouped',
});

const teacherOption = (teacher: Teacher): CustomerOption => ({
  id: teacher.id,
  name: teacher.name,
  type: 'teacher',
  detail: teacher.subject || teacher.email || 'Teacher',
  group: 'Teachers',
});

// Purchase flow: pick (or scan) who bought it and the sale completes immediately.
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
  const { registerHandler, unregisterHandler } = useScanner();
  const [customerSearch, setCustomerSearch] = useState('');
  const [barcodeScan, setBarcodeScan] = useState('');
  const [customerGroupFilter, setCustomerGroupFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const sortedGrades = useMemo(
    () =>
      Array.from(new Set(students.map((student) => student.grade).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })),
    [students],
  );

  const customerOptions = useMemo(
    () => [...students.map(studentOption), ...teachers.map(teacherOption)],
    [students, teachers],
  );

  const normalizedSearch = customerSearch.trim().toLowerCase();
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

  const completeWith = useCallback(async (customer: CustomerOption) => {
    // Guard against a scan and a click (or a double click) both completing the sale.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    const transaction: Transaction = {
      id: `TXN-${Date.now()}`,
      timestamp: new Date(),
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod: 'cash',
      customerType: customer.type,
      customerId: customer.id,
      customerName: customer.name,
    };

    try {
      await onComplete(transaction);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [cart, subtotal, tax, total, onComplete]);

  // Students and teachers share one barcode namespace, so a scan can select either.
  const handleBarcodeMatch = useCallback((scannedValue: string) => {
    const normalizedBarcode = scannedValue.trim().toLowerCase();
    if (!normalizedBarcode) {
      return;
    }
    const matches = (barcode?: string) => (barcode || '').trim().toLowerCase() === normalizedBarcode;

    const matchedCustomers: CustomerOption[] = [
      ...students.filter((student) => matches(student.barcode)).map(studentOption),
      ...teachers.filter((teacher) => matches(teacher.barcode)).map(teacherOption),
    ];

    setBarcodeScan('');

    if (matchedCustomers.length === 1) {
      void completeWith(matchedCustomers[0]);
      return;
    }

    if (matchedCustomers.length > 1) {
      toast.error(
        'Duplicate barcode detected. Admin cleanup is required before checkout can continue.'
      );
      return;
    }

    toast.error('Barcode not found');
  }, [students, teachers, completeWith]);

  // Register customer scanner handler while the modal is open
  useEffect(() => {
    registerHandler({
      id: 'student-scanner',
      handler: handleBarcodeMatch,
      priority: 10, // Higher priority than product scanner
    });

    return () => {
      unregisterHandler('student-scanner');
    };
  }, [registerHandler, unregisterHandler, handleBarcodeMatch]);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Who is buying?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-gray-600 text-sm">Total</div>
            <div className="text-gray-900">{formatCurrency(total)}</div>
          </div>

          {/* Scan — keyboard-wedge scanners type into the focused field */}
          <Input
            autoFocus
            placeholder="Scan student or teacher barcode..."
            value={barcodeScan}
            disabled={isSubmitting}
            onChange={(e) => setBarcodeScan((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBarcodeMatch(barcodeScan);
              }
            }}
          />

          {/* Associate with a whole grade (temporary shortcut) */}
          {sortedGrades.length > 0 && (
            <div>
              <div className="text-gray-600 text-sm mb-2">Or associate with a grade</div>
              <div className="flex flex-wrap gap-2">
                {sortedGrades.map((grade) => (
                  <Button
                    key={grade}
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => completeWith({ id: grade, name: grade, type: 'grade', group: grade })}
                  >
                    {grade}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Pick a person */}
          <div className="rounded border bg-white p-2">
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
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-64 overflow-y-auto overscroll-contain border rounded">
              {filteredCustomers.map(customer => (
                <button
                  key={`${customer.type}-${customer.id}`}
                  disabled={isSubmitting}
                  onClick={() => completeWith(customer)}
                  className="w-full text-left p-2 hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="text-gray-900">{customer.name}</div>
                  <div className="text-gray-500 text-sm">
                    {customer.detail || '—'} • {customer.type}
                  </div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="p-3 text-sm text-gray-500">No customers found.</div>
              )}
            </div>
          </div>

          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
