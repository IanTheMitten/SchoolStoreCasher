import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useScanner } from '../contexts/ScannerContext';
import { TEACHER_BARCODE } from '../services/barcode';

interface LockScreenProps {
  onPasswordSubmit: (password: string) => void;
  onTeacherScan: () => void;
}

export function LockScreen({ onPasswordSubmit, onTeacherScan }: LockScreenProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const { registerHandler, unregisterHandler } = useScanner();

  useEffect(() => {
    registerHandler({
      id: 'lock-screen',
      priority: 100,
      handler: (barcode) => {
        if (barcode.trim() === TEACHER_BARCODE) {
          onTeacherScan();
        } else {
          toast.error('Scan the teacher barcode or enter the password');
        }
      },
    });
    return () => unregisterHandler('lock-screen');
  }, [registerHandler, unregisterHandler, onTeacherScan]);

  const submit = () => onPasswordSubmit(passwordInput);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-lg font-semibold text-gray-900 text-center">School Store</h1>
        <p className="text-sm text-gray-600 text-center">Enter password to access</p>
        <input
          type="password"
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded"
        >
          Enter
        </button>
        <p className="text-xs text-gray-500 text-center">Teachers: scan the teacher barcode to buy items.</p>
      </div>
    </div>
  );
}
