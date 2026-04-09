import type { Student, Transaction } from '../../App';
import type { DateRange } from '../budget/BudgetPage';

export interface DateBounds {
  start: Date;
  end: Date;
}

export interface WeekdayRevenueBucket {
  label: string;
  totalRevenue: number;
  txCount: number;
  avgRevenue: number;
  daysObserved: number;
}

export interface TimePeriodBucket {
  id: string;
  label: string;
  start: number;
  end: number;
  revenue: number;
  txCount: number;
}

export interface TopDay {
  date: Date;
  dayKey: string;
  revenue: number;
  txCount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  revenue: number;
  unitsSold: number;
  profit: number;
  marginPct: number;
}

export interface TopCustomer {
  studentId: string;
  name: string;
  grade: string;
  spend: number;
  visits: number;
  avgSpendPerVisit: number;
}

export const TIME_PERIODS = [
  { id: '09:00-09:10', label: '9:00–9:10', start: 9 * 60, end: 9 * 60 + 10 },
  { id: '09:55-10:05', label: '9:55–10:05', start: 9 * 60 + 55, end: 10 * 60 + 5 },
  { id: '10:50-11:00', label: '10:50–11:00', start: 10 * 60 + 50, end: 11 * 60 },
  { id: '11:45-12:40', label: '11:45–12:40', start: 11 * 60 + 45, end: 12 * 60 + 40 },
  { id: '13:10-13:20', label: '1:10–1:20', start: 13 * 60 + 10, end: 13 * 60 + 20 },
  { id: '14:05-14:15', label: '2:05–2:15', start: 14 * 60 + 5, end: 14 * 60 + 15 },
  { id: '15:00-15:10', label: '3:00–3:10', start: 15 * 60, end: 15 * 60 + 10 },
  { id: '16:00-24:00', label: '4:00+', start: 16 * 60, end: 24 * 60 },
] as const;

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayKeyToDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDateRangeBounds(
  dateRange: DateRange,
  transactions: Transaction[],
  customStart: Date | null,
  customEnd: Date | null,
): DateBounds {
  const now = new Date();
  const today = startOfDay(now);

  switch (dateRange) {
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case 'last7days': {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      return { start: startOfDay(weekStart), end: endOfDay(today) };
    }
    case 'thisMonth':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(today) };
    case 'lastMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'allTime': {
      const oldest = transactions.reduce<Date | null>((acc, tx) => {
        if (!acc || tx.timestamp < acc) {
          return tx.timestamp;
        }
        return acc;
      }, null);
      return { start: startOfDay(oldest ?? today), end: endOfDay(today) };
    }
    case 'custom': {
      const start = customStart ?? today;
      const end = customEnd ?? start;
      return {
        start: startOfDay(start <= end ? start : end),
        end: endOfDay(end >= start ? end : start),
      };
    }
    default:
      return { start: startOfDay(today), end: endOfDay(today) };
  }
}

export function filterByDateRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
  return transactions.filter((tx) => tx.timestamp >= start && tx.timestamp <= end);
}

export function revenueByWeekday(transactions: Transaction[]): WeekdayRevenueBucket[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = labels.map((label) => ({
    label,
    totalRevenue: 0,
    txCount: 0,
    daySet: new Set<string>(),
  }));

  for (const tx of transactions) {
    const index = tx.timestamp.getDay();
    const bucket = buckets[index];
    bucket.totalRevenue += tx.total;
    bucket.txCount += 1;
    bucket.daySet.add(toDayKey(tx.timestamp));
  }

  return buckets
    .filter((bucket) => bucket.label !== 'Sun' && bucket.label !== 'Sat')
    .map((bucket) => ({
      label: bucket.label,
      totalRevenue: bucket.totalRevenue,
      txCount: bucket.txCount,
      avgRevenue: bucket.daySet.size > 0 ? bucket.totalRevenue / bucket.daySet.size : 0,
      daysObserved: bucket.daySet.size,
    }));
}

export function topDaysByRevenue(transactions: Transaction[], limit = 10): TopDay[] {
  const dayMap = new Map<string, TopDay>();

  for (const tx of transactions) {
    const dayKey = toDayKey(tx.timestamp);
    const existing = dayMap.get(dayKey) ?? {
      date: dayKeyToDate(dayKey),
      dayKey,
      revenue: 0,
      txCount: 0,
    };

    existing.revenue += tx.total;
    existing.txCount += 1;
    dayMap.set(dayKey, existing);
  }

  return Array.from(dayMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function revenueByTimePeriod(transactions: Transaction[]): TimePeriodBucket[] {
  const buckets = TIME_PERIODS.map((period) => ({ ...period, revenue: 0, txCount: 0 }));

  for (const tx of transactions) {
    const mins = tx.timestamp.getHours() * 60 + tx.timestamp.getMinutes();
    const bucket = buckets.find((candidate) => mins >= candidate.start && mins < candidate.end);

    if (!bucket) {
      continue;
    }

    bucket.revenue += tx.total;
    bucket.txCount += 1;
  }

  return buckets;
}

export function topProducts(transactions: Transaction[], limit = 15): TopProduct[] {
  const productMap = new Map<string, TopProduct>();

  for (const tx of transactions) {
    for (const item of tx.items) {
      const unitCost = item.product.unitCost ?? 0;
      const revenue = item.product.price * item.quantity;
      const profit = (item.product.price - unitCost) * item.quantity;

      const existing = productMap.get(item.product.id) ?? {
        productId: item.product.id,
        name: item.product.name,
        revenue: 0,
        unitsSold: 0,
        profit: 0,
        marginPct: 0,
      };

      existing.revenue += revenue;
      existing.unitsSold += item.quantity;
      existing.profit += profit;
      existing.marginPct = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      productMap.set(item.product.id, existing);
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function topCustomers(transactions: Transaction[], students: Student[], limit = 10): TopCustomer[] {
  const studentLookup = new Map(students.map((student) => [student.id, student]));
  const customerMap = new Map<string, TopCustomer>();

  for (const tx of transactions) {
    if (!tx.studentId) {
      continue;
    }

    const student = studentLookup.get(tx.studentId);
    const existing = customerMap.get(tx.studentId) ?? {
      studentId: tx.studentId,
      name: student?.name ?? tx.studentId,
      grade: student?.grade ?? '—',
      spend: 0,
      visits: 0,
      avgSpendPerVisit: 0,
    };

    existing.spend += tx.total;
    existing.visits += 1;
    existing.avgSpendPerVisit = existing.visits > 0 ? existing.spend / existing.visits : 0;
    customerMap.set(tx.studentId, existing);
  }

  return Array.from(customerMap.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}
