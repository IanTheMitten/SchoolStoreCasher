import '../../styles/people.css';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCurrency } from '../../contexts/CurrencyContext';
import { AddPersonDialog } from './AddPersonDialog';
import { PersonPanel } from './PersonPanel';
import { GRADES } from './types';
import type { PeopleActions, Person, PersonKind } from './types';
import type { Product, Student, Teacher, Transaction } from '../../App';

interface PeoplePageProps {
  transactions: Transaction[];
  students: Student[];
  teachers: Teacher[];
  products: Product[];
  onUpdateStudents: (students: Student[]) => Promise<void>;
  onCreateTeacher: (teacher: Teacher) => Promise<void>;
  onUpdateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
}

type Filter = 'all' | 'teachers' | `grade:${string}`;
type SortKey = 'name' | 'spent';

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);

export function PeoplePage({ transactions, students, teachers, products, onUpdateStudents, onCreateTeacher, onUpdateTeacher, onDeleteTeacher }: PeoplePageProps) {
  const { formatCurrency } = useCurrency();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<{ kind: PersonKind; id: string } | null>(null);

  const people = useMemo<Person[]>(() => {
    const stats = new Map<string, { spent: number; count: number; last: Date | null }>();
    for (const tx of transactions) {
      if (!tx.customerType || !tx.customerId) continue;
      const key = `${tx.customerType}:${tx.customerId}`;
      const cur = stats.get(key) || { spent: 0, count: 0, last: null };
      cur.spent += tx.total;
      cur.count += 1;
      if (!cur.last || tx.timestamp > cur.last) cur.last = tx.timestamp;
      stats.set(key, cur);
    }
    const make = (kind: PersonKind, p: any): Person => {
      const st = stats.get(`${kind}:${p.id}`);
      return { ...p, kind, spent: st?.spent || 0, purchases: st?.count || 0, lastPurchase: st?.last || null };
    };
    return [...students.map(s => make('student', s)), ...teachers.map(t => make('teacher', t))];
  }, [students, teachers, transactions]);

  const grades = useMemo(() => {
    const present = new Set(students.map(s => s.grade).filter(Boolean));
    const ordered = GRADES.filter(g => present.has(g));
    return [...ordered, ...Array.from(present).filter(g => !GRADES.includes(g)).sort()];
  }, [students]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: people.length, teachers: teachers.length };
    students.forEach(s => { c[`grade:${s.grade}`] = (c[`grade:${s.grade}`] || 0) + 1; });
    return c;
  }, [people.length, students, teachers.length]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = people.filter(p => {
      if (filter === 'teachers' && p.kind !== 'teacher') return false;
      if (filter.startsWith('grade:') && !(p.kind === 'student' && p.grade === filter.slice(6))) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.subject || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => (sort === 'spent' ? b.spent - a.spent || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [people, filter, search, sort]);

  const actions: PeopleActions = {
    students,
    teachers,
    takenBarcodes: () => [...students, ...teachers, ...products].map(x => x.barcode).filter(Boolean) as string[],
    onUpdateStudents,
    onCreateTeacher,
    onUpdateTeacher,
    onDeleteTeacher,
  };

  const selectedPerson = selected ? people.find(p => p.kind === selected.kind && p.id === selected.id) || null : null;

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
        filter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label} <span className={filter === value ? 'text-primary-foreground/70' : 'text-gray-400'}>{counts[value] || 0}</span>
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-70px)] flex-col px-6 py-4 max-w-[1400px] mx-auto">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="mr-2 text-xl text-gray-900">People</h2>
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search name, barcode, subject..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[150px]" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="spent">Sort: Total spent</SelectItem>
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add person
        </Button>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {chip('all', 'All')}
        {chip('teachers', 'Teachers')}
        {grades.map(g => chip(`grade:${g}`, g))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Grade / Subject</th>
              <th className="px-3 py-2 font-medium">Barcode</th>
              <th className="px-3 py-2 text-right font-medium">Total spent</th>
              <th className="px-3 py-2 text-right font-medium">Last purchase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map(p => (
              <tr
                key={`${p.kind}:${p.id}`}
                tabIndex={0}
                onClick={() => setSelected({ kind: p.kind, id: p.id })}
                onKeyDown={(e) => e.key === 'Enter' && setSelected({ kind: p.kind, id: p.id })}
                className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={p.kind === 'teacher' ? 'default' : 'outline'} className="w-[62px] justify-center">
                      {p.kind === 'teacher' ? 'Teacher' : 'Student'}
                    </Badge>
                    <span className="text-gray-900">{p.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-700">{p.kind === 'student' ? p.grade || '—' : p.subject || p.email || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.barcode || '—'}</td>
                <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(p.spent)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.lastPurchase ? formatDate(p.lastPurchase) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {people.length === 0 ? 'No people yet. Use "Add person" to create the first one.' : 'No matches'}
          </div>
        )}
      </div>

      <AddPersonDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        actions={actions}
        defaultKind={filter === 'teachers' ? 'teacher' : 'student'}
        defaultGrade={filter.startsWith('grade:') ? filter.slice(6) : undefined}
      />
      <PersonPanel person={selectedPerson} onClose={() => setSelected(null)} actions={actions} transactions={transactions} />
    </div>
  );
}
