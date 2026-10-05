// Pure customer-insight helpers. A transaction is "named" when it carries customerType + customerId
// (see normalizeTransactionCustomer in App.tsx). Legacy rows with an id but no type are treated as a
// student only when the id matches a known student; everything else is anonymous cash.
import type { Product, Student, Transaction } from '../../App';
import { buildCostMap, lineEconomics, toDate } from './profitAnalytics';

export type CustomerKind = 'student' | 'teacher';

export interface ResolvedCustomer {
  key: string;
  kind: CustomerKind;
  id: string;
}

export function resolveCustomer(tx: Transaction, studentIds: Set<string>): ResolvedCustomer | null {
  const id = tx.customerId ? String(tx.customerId) : '';
  if (!id) return null;
  const kind: CustomerKind | null =
    tx.customerType === 'student' || tx.customerType === 'teacher'
      ? tx.customerType
      : studentIds.has(id)
        ? 'student'
        : null;
  if (!kind) return null;
  return { key: `${kind}:${id}`, kind, id };
}

function txRevenueAndCost(tx: Transaction, costMap: Map<string, number>) {
  let revenue = 0;
  let cost = 0;
  for (const item of tx.items ?? []) {
    const l = lineEconomics(item, costMap);
    revenue += l.revenue;
    cost += l.cost;
  }
  return { revenue, cost };
}

export interface CustomerRow {
  key: string;
  kind: CustomerKind;
  id: string;
  name: string;
  grade?: string;
  revenue: number;
  profit: number;
  visits: number;
  avgPerVisit: number;
}

export interface CustomerInsights {
  top: CustomerRow[]; // all named customers sorted by spend (caller slices)
  named: { revenue: number; transactions: number };
  anonymous: { revenue: number; transactions: number };
  newVsReturning: {
    newBuyers: number;
    returningBuyers: number;
    newRevenue: number;
    returningRevenue: number;
    /** Buyers with 2+ purchases inside the range / all named buyers in range. null when no buyers. */
    repeatRatePct: number | null;
    /** True when the range starts before any recorded purchase, so everybody looks "new". */
    coversAllHistory: boolean;
  };
  byGrade: GradeRow[];
}

export interface GradeRow {
  grade: string;
  revenue: number;
  buyers: number;
  enrolled: number;
  participationPct: number | null;
}

export function compareGrades(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function customerInsights(
  rangeTx: Transaction[],
  allTx: Transaction[],
  students: Student[],
  products: Product[],
  teacherNames?: Map<string, string>,
): CustomerInsights {
  const costMap = buildCostMap(products);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const studentIds = new Set(studentById.keys());

  // First purchase ever per customer (named only).
  const firstEver = new Map<string, number>();
  for (const tx of allTx) {
    const c = resolveCustomer(tx, studentIds);
    const ts = toDate(tx.timestamp);
    if (!c || !ts) continue;
    const t = ts.getTime();
    const prev = firstEver.get(c.key);
    if (prev === undefined || t < prev) firstEver.set(c.key, t);
  }

  const rows = new Map<string, CustomerRow>();
  const named = { revenue: 0, transactions: 0 };
  const anonymous = { revenue: 0, transactions: 0 };
  let rangeStartMs = Infinity;
  for (const tx of rangeTx) {
    const ts = toDate(tx.timestamp);
    if (ts) rangeStartMs = Math.min(rangeStartMs, ts.getTime());
    const { revenue, cost } = txRevenueAndCost(tx, costMap);
    const c = resolveCustomer(tx, studentIds);
    if (!c) {
      anonymous.revenue += revenue;
      anonymous.transactions += 1;
      continue;
    }
    named.revenue += revenue;
    named.transactions += 1;
    const student = c.kind === 'student' ? studentById.get(c.id) : undefined;
    const row =
      rows.get(c.key) ??
      ({
        key: c.key,
        kind: c.kind,
        id: c.id,
        name: tx.customerName || student?.name || teacherNames?.get(c.id) || 'Unknown customer',
        grade: student?.grade,
        revenue: 0,
        profit: 0,
        visits: 0,
        avgPerVisit: 0,
      } as CustomerRow);
    row.revenue += revenue;
    row.profit += revenue - cost;
    row.visits += 1;
    rows.set(c.key, row);
  }

  const top = Array.from(rows.values())
    .map((r) => ({ ...r, avgPerVisit: r.visits > 0 ? r.revenue / r.visits : 0 }))
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits || a.name.localeCompare(b.name));

  // New vs returning: "new" = first ever recorded purchase falls inside the range.
  const rangeEarliestAll = Array.from(firstEver.values()).reduce((m, v) => Math.min(m, v), Infinity);
  let newBuyers = 0;
  let returningBuyers = 0;
  let newRevenue = 0;
  let returningRevenue = 0;
  let repeaters = 0;
  // Determine range start from the earliest tx in range for the comparison below.
  for (const r of top) {
    const first = firstEver.get(r.key);
    const isNew = first !== undefined && first >= rangeStartMs;
    if (isNew) {
      newBuyers += 1;
      newRevenue += r.revenue;
    } else {
      returningBuyers += 1;
      returningRevenue += r.revenue;
    }
    if (r.visits >= 2) repeaters += 1;
  }

  // Grade table (students only).
  const enrolledByGrade = new Map<string, number>();
  for (const s of students) {
    const g = (s.grade || '').trim() || 'Unknown';
    enrolledByGrade.set(g, (enrolledByGrade.get(g) ?? 0) + 1);
  }
  const gradeAgg = new Map<string, { revenue: number; buyers: number }>();
  for (const r of top) {
    if (r.kind !== 'student') continue;
    const g = (r.grade || '').trim() || 'Unknown';
    const a = gradeAgg.get(g) ?? { revenue: 0, buyers: 0 };
    a.revenue += r.revenue;
    a.buyers += 1;
    gradeAgg.set(g, a);
  }
  const byGrade: GradeRow[] = Array.from(new Set([...enrolledByGrade.keys(), ...gradeAgg.keys()]))
    .map((grade) => {
      const a = gradeAgg.get(grade) ?? { revenue: 0, buyers: 0 };
      const enrolled = enrolledByGrade.get(grade) ?? 0;
      return {
        grade,
        revenue: a.revenue,
        buyers: a.buyers,
        enrolled,
        participationPct: enrolled > 0 ? Math.min(100, (a.buyers / enrolled) * 100) : null,
      };
    })
    .sort((x, y) => compareGrades(x.grade, y.grade));

  return {
    top,
    named,
    anonymous,
    newVsReturning: {
      newBuyers,
      returningBuyers,
      newRevenue,
      returningRevenue,
      repeatRatePct: top.length > 0 ? (repeaters / top.length) * 100 : null,
      coversAllHistory: rangeStartMs !== Infinity && rangeEarliestAll >= rangeStartMs && returningBuyers === 0,
    },
    byGrade,
  };
}
