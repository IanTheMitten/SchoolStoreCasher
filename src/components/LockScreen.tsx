import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useScanner } from '../contexts/ScannerContext';
import { TEACHER_BARCODE } from '../services/barcode';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
      {/* Only classes present in the precompiled index.css render (e.g. max-w-md, not max-w-sm). */}
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold text-gray-900 text-center">School Store</h1>
        <p className="text-sm text-gray-600 text-center">Enter password to access</p>
        <Input
          type="password"
          aria-label="Password"
          placeholder="Password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button onClick={submit} className="w-full">
          Enter
        </Button>
        <p className="text-xs text-gray-500 text-center">Teachers: scan the teacher barcode to buy items.</p>
      </div>
    </div>
  );
}
