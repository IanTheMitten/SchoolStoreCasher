import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { parseStudentCsv } from './csvImport';
import type { StudentCsvParseResult, StudentCsvRow } from './csvImport';
import type { StudentImportMode, StudentImportResult } from '../../services/localDb';

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount: number;
  onImport: (rows: StudentCsvRow[], mode: StudentImportMode) => Promise<StudentImportResult>;
}

export function ImportStudentsDialog({ open, onOpenChange, existingCount, onImport }: ImportStudentsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<(StudentCsvParseResult & { fileName: string }) | null>(null);
  const [mode, setMode] = useState<StudentImportMode>('add');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setParsed(null);
    setMode('add');
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setParsed({ ...parseStudentCsv(await file.text()), fileName: file.name });
    } catch (error: any) {
      toast.error(error?.message || 'Could not read file');
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setBusy(true);
    try {
      const result = await onImport(parsed.rows, mode);
      const parts = [`${result.created} added`, `${result.updated} updated`];
      if (mode === 'replace') parts.push(`${result.removed} removed`);
      toast.success(`Students imported: ${parts.join(', ')}`);
      if (result.skippedTeacherBarcodes.length > 0) {
        toast.error(`Skipped ${result.skippedTeacherBarcodes.length} row(s) whose barcode belongs to a teacher: ${result.skippedTeacherBarcodes.slice(0, 5).join(', ')}`);
      }
      setBusy(false);
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(`Import failed, no changes were made: ${error?.message || 'unknown error'}`);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import students from CSV</DialogTitle>
          <DialogDescription>
            One student per line: <span className="font-mono">barcode|name|grade</span> (commas or tabs also work).
            Grades like G7 become "Grade 7".
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy} className="gap-2">
            <Upload className="size-4" />
            Choose file
          </Button>
          <span className="truncate text-sm text-gray-600">{parsed?.fileName || 'No file chosen'}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileChosen}
          />
        </div>

        {parsed && (
          <div className="space-y-3">
            <div className="text-sm text-gray-900">{parsed.rows.length} student(s) found</div>

            {parsed.rows.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-gray-200 text-xs">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    {parsed.rows.slice(0, 5).map(r => (
                      <tr key={r.barcode}>
                        <td className="px-2 py-1 font-mono text-gray-600">{r.barcode}</td>
                        <td className="px-2 py-1 text-gray-900">{r.name}</td>
                        <td className="px-2 py-1 text-gray-700">{r.grade || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 5 && <div className="px-2 py-1 text-gray-400">…and {parsed.rows.length - 5} more</div>}
              </div>
            )}

            {parsed.problems.length > 0 && (
              <div className="max-h-28 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {parsed.problems.map(p => <div key={p}>{p}</div>)}
              </div>
            )}

            <RadioGroup value={mode} onValueChange={(v) => setMode(v as StudentImportMode)}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="add" id="import-add" className="mt-0.5" />
                <Label htmlFor="import-add" className="flex-col items-start gap-0.5 font-normal">
                  <span>Add to existing students</span>
                  <span className="text-xs text-gray-500">Keeps current students. Matching barcodes get their name and grade updated.</span>
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="replace" id="import-replace" className="mt-0.5" />
                <Label htmlFor="import-replace" className="flex-col items-start gap-0.5 font-normal">
                  <span>Replace all students</span>
                  <span className="text-xs text-gray-500">
                    Of the {existingCount} current student(s), any whose barcode isn't in this file are removed. Teachers and purchase history are kept.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={busy || !parsed || parsed.rows.length === 0}
            variant={mode === 'replace' ? 'destructive' : 'default'}
          >
            {mode === 'replace' ? 'Replace students' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
