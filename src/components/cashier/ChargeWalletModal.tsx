import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import type { Student } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useScanner } from '../../contexts/ScannerContext';
import { WALLET_STEP } from '../../services/localDb';

interface ChargeWalletModalProps {
  students: Student[];
  walletBalances: Record<string, number>;
  onCharge: (studentId: string, amount: number) => Promise<number>;
  onClose: () => void;
}

const QUICK_AMOUNTS = [1000, 5000, 10000];

// Student hands over cash; it goes into their wallet (same pool as cashback points).
export function ChargeWalletModal({ students, walletBalances, onCharge, onClose }: ChargeWalletModalProps) {
  const { formatCurrency } = useCurrency();
  const { registerHandler, unregisterHandler } = useScanner();
  const [student, setStudent] = useState<Student | null>(null);
  const [barcodeScan, setBarcodeScan] = useState('');
  const [amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleBarcodeMatch = useCallback((scannedValue: string) => {
    const normalizedBarcode = scannedValue.trim().toLowerCase();
    setBarcodeScan('');
    if (!normalizedBarcode || submittingRef.current) return;

    const matches = students.filter(s => (s.barcode || '').trim().toLowerCase() === normalizedBarcode);
    if (matches.length === 1) {
      setStudent(matches[0]);
      return;
    }
    toast.error(matches.length > 1 ? 'Duplicate student barcode. Fix it on the People page.' : 'Student barcode not found');
  }, [students]);

  useEffect(() => {
    registerHandler({ id: 'wallet-charge-scanner', handler: handleBarcodeMatch, priority: 20 });
    return () => unregisterHandler('wallet-charge-scanner');
  }, [registerHandler, unregisterHandler, handleBarcodeMatch]);

  const validAmount = amount > 0 && Number.isInteger(amount) && amount % WALLET_STEP === 0;
  const balance = student ? walletBalances[student.id] || 0 : 0;

  const handleCharge = async () => {
    if (!student || !validAmount || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const newBalance = await onCharge(student.id, amount);
      toast.success(`Charged ${formatCurrency(amount)} to ${student.name}. New balance ${formatCurrency(newBalance)}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to charge wallet');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charge student wallet</DialogTitle>
        </DialogHeader>

        {student ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Student</span>
                <span className="text-gray-900">{student.name}{student.grade ? ` • ${student.grade}` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current balance</span>
                <span className="text-gray-900">{formatCurrency(balance)}</span>
              </div>
              {validAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">After charge</span>
                  <span className="text-gray-900">{formatCurrency(balance + amount)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-gray-600 text-sm" htmlFor="charge-amount">
                Cash received (steps of {formatCurrency(WALLET_STEP)})
              </label>
              <Input
                id="charge-amount"
                type="number"
                autoFocus
                data-scanner-input
                min={WALLET_STEP}
                step={WALLET_STEP}
                value={amount || ''}
                disabled={isSubmitting}
                onChange={(e) => setAmount(Number((e.target as HTMLInputElement).value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCharge();
                  }
                }}
              />
              {amount > 0 && !validAmount && (
                <div className="text-red-600 text-sm mt-1">Use a multiple of {formatCurrency(WALLET_STEP)}.</div>
              )}
              <div className="flex gap-2 mt-2">
                {QUICK_AMOUNTS.map(quick => (
                  <Button key={quick} variant="outline" size="sm" disabled={isSubmitting} onClick={() => setAmount(quick)}>
                    {formatCurrency(quick)}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full" disabled={isSubmitting || !validAmount} onClick={handleCharge}>
              Charge {validAmount ? formatCurrency(amount) : ''}
            </Button>
            <Button variant="ghost" className="w-full" disabled={isSubmitting} onClick={() => setStudent(null)}>
              Back
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              autoFocus
              data-scanner-input
              placeholder="Scan student barcode..."
              value={barcodeScan}
              onChange={(e) => setBarcodeScan((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBarcodeMatch(barcodeScan);
                }
              }}
            />

            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
