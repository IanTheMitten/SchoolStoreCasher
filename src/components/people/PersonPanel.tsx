import { useEffect, useState } from 'react';
import { Pencil, Trash2, RefreshCw, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCurrency } from '../../contexts/CurrencyContext';
import { generateEan13 } from '../../services/barcode';
import { BarcodeCard } from './BarcodeCard';
import { GENDERS, GRADES } from './types';
import type { PeopleActions, Person } from './types';
import type { Transaction } from '../../App';

interface PersonPanelProps {
  person: Person | null;
  onClose: () => void;
  actions: PeopleActions;
  transactions: Transaction[];
}

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);

export function PersonPanel({ person, onClose, actions, transactions }: PersonPanelProps) {
  const { formatCurrency } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', gender: '', subject: '', email: '', barcode: '' });

  useEffect(() => {
    setEditing(false);
  }, [person?.id]);

  const history = person
    ? transactions
        .filter(tx => tx.customerType === person.kind && tx.customerId === person.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  const startEdit = () => {
    if (!person) return;
    setForm({
      name: person.name,
      grade: person.grade || 'Grade 9',
      gender: person.gender || 'Male',
      subject: person.subject || '',
      email: person.email || '',
      barcode: person.barcode || '',
    });
    setEditing(true);
  };

  // Single write path per kind: App handlers persist (optimistic, revert on error).
  const applyChanges = async (changes: { name?: string; grade?: string; gender?: string; subject?: string; email?: string; barcode?: string }) => {
    if (!person) return;
    if (person.kind === 'student') {
      await actions.onUpdateStudents(actions.students.map(s => (s.id === person.id ? { ...s, ...changes } : s)));
    } else {
      await actions.onUpdateTeacher(person.id, changes);
    }
  };

  const hasBarcodeConflict = (code: string) =>
    !!code &&
    [...actions.students, ...actions.teachers].some(p => p.id !== person?.id && (p.barcode || '').toLowerCase() === code);

  const handleSave = async () => {
    if (!person) return;
    const name = form.name.trim();
    if (!name) {
      toast.error('Please enter a name');
      return;
    }
    const barcode = form.barcode.trim().toLowerCase();
    if (hasBarcodeConflict(barcode)) {
      toast.error('That barcode is already used by another student or teacher');
      return;
    }
    try {
      await applyChanges(
        person.kind === 'student'
          ? { name, grade: form.grade, gender: form.gender, barcode: barcode || undefined }
          : { name, subject: form.subject.trim() || undefined, email: form.email.trim() || undefined, barcode: barcode || undefined }
      );
      toast.success('Saved');
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  const handleGenerate = async (regenerate: boolean) => {
    if (!person) return;
    if (regenerate && !confirm(`Generate a new barcode for ${person.name}? The old barcode will stop working.`)) return;
    try {
      await applyChanges({ barcode: generateEan13(actions.takenBarcodes()) });
      toast.success(regenerate ? 'Barcode regenerated' : 'Barcode generated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate barcode');
    }
  };

  const handleDelete = async () => {
    if (!person) return;
    if (!confirm(`Delete ${person.name}? Past purchases stay in the records.`)) return;
    try {
      if (person.kind === 'student') {
        await actions.onUpdateStudents(actions.students.filter(s => s.id !== person.id));
      } else {
        await actions.onDeleteTeacher(person.id);
      }
      toast.success(`${person.name} deleted`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const subtitle = person ? (person.kind === 'student' ? person.grade || '' : person.subject || 'Teacher') : '';

  return (
    <Sheet open={!!person} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto gap-0">
        {person && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-2 pr-8">
                <Badge variant={person.kind === 'teacher' ? 'default' : 'outline'}>
                  {person.kind === 'teacher' ? 'Teacher' : 'Student'}
                </Badge>
                <SheetTitle className="truncate">{person.name}</SheetTitle>
              </div>
              <SheetDescription>
                {subtitle ? `${subtitle} · ` : ''}Total spent {formatCurrency(person.spent)} · {person.purchases} purchase{person.purchases === 1 ? '' : 's'}
              </SheetDescription>
            </SheetHeader>

            <div className="p-4 space-y-5">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  {person.kind === 'student' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Grade</Label>
                        <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set([...GRADES, form.grade])).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Gender</Label>
                        <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-subject">Subject</Label>
                        <Input id="edit-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input id="edit-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="edit-barcode">Barcode</Label>
                    <Input id="edit-barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>Save</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {person.kind === 'student' ? (
                      <>
                        <dt className="text-gray-500">Grade</dt><dd>{person.grade || '—'}</dd>
                        <dt className="text-gray-500">Gender</dt><dd>{person.gender || '—'}</dd>
                      </>
                    ) : (
                      <>
                        <dt className="text-gray-500">Subject</dt><dd>{person.subject || '—'}</dd>
                        <dt className="text-gray-500">Email</dt><dd className="break-all">{person.email || '—'}</dd>
                      </>
                    )}
                    <dt className="text-gray-500">Last purchase</dt>
                    <dd>{person.lastPurchase ? formatDateTime(person.lastPurchase) : '—'}</dd>
                  </dl>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="size-4 mr-1.5" />Edit</Button>
                    <Button variant="outline" size="sm" onClick={handleDelete} aria-label="Delete person">
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Barcode</h3>
                  {person.barcode && (
                    <Button variant="ghost" size="sm" onClick={() => handleGenerate(true)}>
                      <RefreshCw className="size-4 mr-1.5" />Regenerate
                    </Button>
                  )}
                </div>
                {person.barcode ? (
                  <BarcodeCard value={person.barcode} name={person.name} subtitle={subtitle} />
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
                    <p className="mb-3">No barcode yet.</p>
                    <Button size="sm" onClick={() => handleGenerate(false)}>
                      <Wand2 className="size-4 mr-1.5" />Generate barcode
                    </Button>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-900">Purchase history</h3>
                {history.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">No purchases found</div>
                ) : (
                  <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {history.map(tx => (
                      <li key={tx.id} className="p-3 text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-gray-900">{formatDateTime(tx.timestamp)}</span>
                          <span className="font-semibold">{formatCurrency(tx.total)}</span>
                        </div>
                        <div className="mt-1 space-y-0.5 text-gray-600">
                          {tx.items.map(item => (
                            <div key={item.product.id}>
                              {item.product.name}
                              <span className="text-gray-400"> × {item.quantity} @ {formatCurrency(item.product.price)}</span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
