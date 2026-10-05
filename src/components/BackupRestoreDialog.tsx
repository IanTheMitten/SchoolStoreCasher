import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { backupAPI } from '../services/api';

export const LAST_BACKUP_KEY = 'schoolstore_last_backup';
export const BACKUP_REMINDER_DAYS = 7;

export function getLastBackup(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function isBackupOverdue(): boolean {
  const last = getLastBackup();
  if (!last) return true;
  return Date.now() - last.getTime() > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}

const pad = (n: number) => String(n).padStart(2, '0');

const backupFileName = (d: Date) =>
  `schoolstore-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;

const LABELS: Record<string, string> = {
  products: 'Products',
  students: 'Students',
  teachers: 'Teachers',
  transactions: 'Transactions',
  expenses: 'Expenses',
  categories: 'Categories',
  inventoryAdjustments: 'Stock adjustments',
};

interface BackupRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackupDone?: () => void;
}

export function BackupRestoreDialog({ open, onOpenChange, onBackupDone }: BackupRestoreDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(() => getLastBackup());
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ snapshot: any; counts: Record<string, number>; fileName: string } | null>(null);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const snapshot = await backupAPI.exportAll();
      const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      a.href = url;
      a.download = backupFileName(now);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      try { localStorage.setItem(LAST_BACKUP_KEY, now.toISOString()); } catch {}
      setLastBackup(now);
      onBackupDone?.();
      toast.success('Backup downloaded');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create backup');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const { snapshot, counts } = backupAPI.inspect(raw);
      setPending({ snapshot, counts, fileName: file.name });
    } catch (error: any) {
      toast.error(error instanceof SyntaxError ? 'Invalid backup file: not valid JSON.' : (error?.message || 'Invalid backup file'));
    }
  };

  const handleConfirmRestore = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await backupAPI.restore(pending.snapshot);
      toast.success('Backup restored. Reloading...');
      setTimeout(() => window.location.reload(), 600);
    } catch (error: any) {
      toast.error(`Restore failed, no changes were made: ${error?.message || 'unknown error'}`);
      setBusy(false);
    }
    setPending(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup &amp; Restore</DialogTitle>
            <DialogDescription>
              All store data lives only in this browser. Download a backup regularly and keep it somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            Last backed up: {lastBackup ? lastBackup.toLocaleString() : 'never'}
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleDownload} disabled={busy} className="gap-2">
              <Download className="size-4" />
              Download backup
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy} className="gap-2">
              <Upload className="size-4" />
              Restore from file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleFileChosen}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all current data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-2">
                  Restoring {pending?.fileName} will permanently replace everything currently stored with:
                </p>
                <ul className="text-sm space-y-0.5">
                  {pending && Object.entries(pending.counts).map(([name, count]) => (
                    <li key={name}>{LABELS[name] || name}: {count}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>Replace and restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
