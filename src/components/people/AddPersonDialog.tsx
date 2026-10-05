import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { generateEan13 } from '../../services/barcode';
import { GENDERS, GRADES, newId } from './types';
import type { PeopleActions, PersonKind } from './types';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PeopleActions;
  defaultKind?: PersonKind;
  defaultGrade?: string;
}

export function AddPersonDialog({ open, onOpenChange, actions, defaultKind = 'student', defaultGrade }: AddPersonDialogProps) {
  const [kind, setKind] = useState<PersonKind>('student');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Grade 9');
  const [gender, setGender] = useState('Male');
  const [barcode, setBarcode] = useState('');
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  // ui/Input does not forward refs (React 18 function component), so focus by id.
  const focusField = (id: string, select = false) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.focus();
    if (select) el?.select();
  };

  useEffect(() => {
    if (open) {
      setKind(defaultKind);
      setGrade(defaultGrade || 'Grade 9');
      setName('');
      setBarcode('');
      setSubject('');
      setEmail('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (another: boolean) => {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter a name');
      focusField('person-name');
      return;
    }
    setSaving(true);
    try {
      if (kind === 'student') {
        const code = barcode.trim().toLowerCase();
        if (code && [...actions.students, ...actions.teachers].some(p => (p.barcode || '').toLowerCase() === code)) {
          toast.error('That barcode is already used by another student or teacher');
          focusField('person-barcode', true);
          return;
        }
        await actions.onUpdateStudents([
          ...actions.students,
          { id: newId('stu'), name: trimmed, grade, gender, barcode: code || undefined },
        ]);
      } else {
        await actions.onCreateTeacher({
          id: newId('t'),
          name: trimmed,
          subject: subject.trim() || undefined,
          email: email.trim() || undefined,
          barcode: generateEan13(actions.takenBarcodes()),
        });
      }
      toast.success(`${kind === 'student' ? 'Student' : 'Teacher'} "${trimmed}" added`);
      if (another) {
        setName('');
        setBarcode('');
        setSubject('');
        setEmail('');
        focusField('person-name');
      } else {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add person</DialogTitle>
          <DialogDescription>
            {kind === 'student'
              ? 'Scan the student ID barcode, or leave it blank and add one later.'
              : 'A barcode is generated automatically so the teacher can use it at checkout.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
        >
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Person type">
            {(['student', 'teacher'] as const).map(k => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-md py-1.5 text-sm transition-colors ${
                  kind === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {k === 'student' ? 'Student' : 'Teacher'}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="person-name">Full name</Label>
            <Input
              id="person-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'student' ? 'e.g., John Smith' : 'e.g., Ms. Kim'}
              onKeyDown={(e) => {
                // Students: Enter hops to the barcode field so a scan can follow immediately.
                if (e.key === 'Enter' && kind === 'student' && name.trim() && !barcode) {
                  e.preventDefault();
                  focusField('person-barcode');
                }
              }}
            />
          </div>

          {kind === 'student' ? (
            <>
              <div>
                <Label htmlFor="person-barcode">Barcode</Label>
                <Input
                  id="person-barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan student ID barcode (optional)"
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="person-grade">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="person-grade"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="person-gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="person-gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="person-subject">Subject</Label>
                <Input id="person-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="person-email">Email</Label>
                <Input id="person-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void submit(true)}>
              Save &amp; add another
            </Button>
            <Button type="submit" disabled={saving}>Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
