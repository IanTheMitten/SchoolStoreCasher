import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import type { CartItem, Transaction, Student, Teacher } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useScanner } from '../../contexts/ScannerContext';
import { WALLET_STEP, CASHBACK_PERCENT, cashbackFor } from '../../services/localDb';
import { GRADES } from '../people/types';

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
  walletBalances?: Record<string, number>;
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
  walletBalances = {},
  onComplete,
  onClose
}: CashPaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const { registerHandler, unregisterHandler } = useScanner();
  const [barcodeScan, setBarcodeScan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  // Student with a usable wallet balance, waiting for the wallet/cash split to be confirmed.
  const [walletCustomer, setWalletCustomer] = useState<CustomerOption | null>(null);
  const [walletAmount, setWalletAmount] = useState(0);

  // Wallet pays in whole steps of WALLET_STEP, never more than the balance or the total.
  const maxWalletFor = useCallback(
    (studentId: string) => {
      const usable = Math.min(walletBalances[studentId] || 0, total);
      return Math.max(0, Math.floor(usable / WALLET_STEP) * WALLET_STEP);
    },
    [walletBalances, total],
  );

  // Every standard grade is always offered (even with no students in it yet), plus any others found in the data.
  const sortedGrades = useMemo(() => {
    const present = new Set(students.map((student) => student.grade).filter(Boolean));
    const extras = Array.from(present)
      .filter((grade) => !GRADES.includes(grade))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return [...GRADES, ...extras];
  }, [students]);

  const completeWith = useCallback(async (customer: CustomerOption, walletPaid = 0) => {
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
      paymentMethod: walletPaid > 0 && walletPaid >= total ? 'wallet' : 'cash',
      customerType: customer.type,
      customerId: customer.id,
      customerName: customer.name,
      walletPaid,
      cashPaid: total - walletPaid,
    };

    try {
      await onComplete(transaction);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [cart, subtotal, tax, total, onComplete]);

  // Students with enough balance get the wallet step; everyone else completes right away.
  const selectCustomer = useCallback((customer: CustomerOption) => {
    if (submittingRef.current) return;
    const maxWallet = customer.type === 'student' ? maxWalletFor(customer.id) : 0;
    if (maxWallet > 0) {
      setWalletCustomer(customer);
      setWalletAmount(maxWallet);
      return;
    }
    void completeWith(customer);
  }, [maxWalletFor, completeWith]);

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
      selectCustomer(matchedCustomers[0]);
      return;
    }

    if (matchedCustomers.length > 1) {
      toast.error(
        'Duplicate barcode detected. Admin cleanup is required before checkout can continue.'
      );
      return;
    }

    toast.error('Barcode not found');
  }, [students, teachers, selectCustomer]);

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
          <DialogTitle>{walletCustomer ? 'Pay from wallet?' : 'Who is buying?'}</DialogTitle>
        </DialogHeader>

        {walletCustomer ? (() => {
          const balance = walletBalances[walletCustomer.id] || 0;
          const maxWallet = maxWalletFor(walletCustomer.id);
          const amount = Math.min(Math.max(0, walletAmount), maxWallet);
          const valid = amount % WALLET_STEP === 0;
          return (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student</span>
                  <span className="text-gray-900">{walletCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wallet balance</span>
                  <span className="text-gray-900">{formatCurrency(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>

              <div>
                <label className="text-gray-600 text-sm" htmlFor="wallet-amount">
                  From wallet (steps of {formatCurrency(WALLET_STEP)}, max {formatCurrency(maxWallet)})
                </label>
                <Input
                  id="wallet-amount"
                  type="number"
                  min={0}
                  max={maxWallet}
                  step={WALLET_STEP}
                  value={walletAmount}
                  disabled={isSubmitting}
                  onChange={(e) => setWalletAmount(Number((e.target as HTMLInputElement).value) || 0)}
                />
                {!valid && (
                  <div className="text-red-600 text-sm mt-1">Use a multiple of {formatCurrency(WALLET_STEP)}.</div>
                )}
              </div>

              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wallet</span>
                  <span className="text-gray-900">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash to collect</span>
                  <span className="text-gray-900">{formatCurrency(total - amount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Cashback ({CASHBACK_PERCENT}%)</span>
                  <span>+{formatCurrency(cashbackFor(total))}</span>
                </div>
              </div>

              <Button
                autoFocus
                className="w-full"
                disabled={isSubmitting || !valid || amount <= 0}
                onClick={() => completeWith(walletCustomer, amount)}
              >
                <Wallet className="size-4 mr-2" />
                Pay {formatCurrency(amount)} from wallet
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
                onClick={() => completeWith(walletCustomer, 0)}
              >
                Pay all in cash
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={isSubmitting}
                onClick={() => setWalletCustomer(null)}
              >
                Back
              </Button>
            </div>
          );
        })() : (
        <div className="space-y-4">
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-gray-600 text-sm">Total</div>
            <div className="text-gray-900">{formatCurrency(total)}</div>
          </div>

          {/* Scan — keyboard-wedge scanners type into the focused field */}
          <Input
            autoFocus
            data-scanner-input
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
          <div>
            <div className="text-gray-600 text-sm mb-2">No barcode? Associate with a grade</div>
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

          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full">
            Cancel
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
