import type { Student, Transaction } from '../../App';

export interface TimePeriodDefinition {
  id: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
}

export interface TimePeriodRevenueDatum {
  periodId: string;
  periodLabel: string;
  totalRevenue: number;
  transactionCount: number;
}

export interface RankedDayRevenue {
  dayKey: string;
  date: Date;
  revenue: number;
  transactionCount: number;
}

export interface RankedProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
}

export interface RankedCustomerRevenue {
  studentId: string;
  studentName: string;
  revenue: number;
  transactionCount: number;
}

const WEEKDAY_START = 1;
const WEEKDAY_END = 5;

export const CANONICAL_TIME_PERIODS: TimePeriodDefinition[] = [
  { id: '09:00-09:10', label: '9:00–9:10', startMinutes: 9 * 60, endMinutes: 9 * 60 + 10 },
  { id: '09:55-10:05', label: '9:55–10:05', startMinutes: 9 * 60 + 55, endMinutes: 10 * 60 + 5 },
  { id: '10:50-11:00', label: '10:50–11:00', startMinutes: 10 * 60 + 50, endMinutes: 11 * 60 },
  { id: '11:45-12:40', label: '11:45–12:40', startMinutes: 11 * 60 + 45, endMinutes: 12 * 60 + 40 },
  { id: '13:10-13:20', label: '1:10–1:20', startMinutes: 13 * 60 + 10, endMinutes: 13 * 60 + 20 },
  { id: '14:05-14:15', label: '2:05–2:15', startMinutes: 14 * 60 + 5, endMinutes: 14 * 60 + 15 },
  { id: '15:00-15:10', label: '3:00–3:10', startMinutes: 15 * 60, endMinutes: 15 * 60 + 10 },
  { id: '16:00-24:00', label: '4:00–24:00', startMinutes: 16 * 60, endMinutes: 24 * 60 },
];

export function getLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= WEEKDAY_START && day <= WEEKDAY_END;
}

function getPeriodIdForTimestamp(timestamp: Date): string | null {
  const localMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
  const matchedPeriod = CANONICAL_TIME_PERIODS.find(
    (period) => localMinutes >= period.startMinutes && localMinutes < period.endMinutes,
  );

  return matchedPeriod?.id ?? null;
}

export function filterByDateRange(transactions: Transaction[], start?: Date | null, end?: Date | null): Transaction[] {
  const startAt = start ? getLocalDayStart(start).getTime() : null;
  const endExclusive = end
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime()
    : null;

  return transactions.filter((transaction) => {
    const timestamp = transaction.timestamp.getTime();
    if (startAt !== null && timestamp < startAt) {
      return false;
    }
    if (endExclusive !== null && timestamp >= endExclusive) {
      return false;
    }
    return true;
  });
}

export function revenueByWeekday(transactions: Transaction[]) {
  const weekdayBuckets = [
    { label: 'Mon', totalRevenue: 0, dayCount: 0, avgRevenue: 0 },
    { label: 'Tue', totalRevenue: 0, dayCount: 0, avgRevenue: 0 },
    { label: 'Wed', totalRevenue: 0, dayCount: 0, avgRevenue: 0 },
    { label: 'Thu', totalRevenue: 0, dayCount: 0, avgRevenue: 0 },
    { label: 'Fri', totalRevenue: 0, dayCount: 0, avgRevenue: 0 },
  ];

  const totalsByDay = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isWeekday(transaction.timestamp)) {
      continue;
    }

    const dayKey = getLocalDayKey(transaction.timestamp);
    const running = totalsByDay.get(dayKey) ?? 0;
    totalsByDay.set(dayKey, running + transaction.total);
  }

  for (const [dayKey, dayRevenue] of totalsByDay.entries()) {
    if (dayRevenue <= 0) {
      continue;
    }

    const [year, month, day] = dayKey.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const target = weekdayBuckets[dayOfWeek - 1];
    if (!target) {
      continue;
    }

    target.totalRevenue += dayRevenue;
    target.dayCount += 1;
  }

  return weekdayBuckets.map((bucket) => ({
    weekday: bucket.label,
    totalRevenue: bucket.totalRevenue,
    dayCount: bucket.dayCount,
    avgRevenue: bucket.dayCount > 0 ? bucket.totalRevenue / bucket.dayCount : 0,
  }));
}

export function topDaysByRevenue(transactions: Transaction[], limit = 10): RankedDayRevenue[] {
  const byDay = new Map<string, RankedDayRevenue>();

  for (const transaction of transactions) {
    const dayKey = getLocalDayKey(transaction.timestamp);
    const existing = byDay.get(dayKey);
    if (existing) {
      existing.revenue += transaction.total;
      existing.transactionCount += 1;
      continue;
    }

    byDay.set(dayKey, {
      dayKey,
      date: getLocalDayStart(transaction.timestamp),
      revenue: transaction.total,
      transactionCount: 1,
    });
  }

  return Array.from(byDay.values())
    .sort((a, b) => (b.revenue === a.revenue
      ? b.date.getTime() - a.date.getTime()
      : b.revenue - a.revenue))
    .slice(0, limit);
}

export function revenueByTimePeriod(transactions: Transaction[]): TimePeriodRevenueDatum[] {
  const periodStats = new Map(
    CANONICAL_TIME_PERIODS.map((period) => [period.id, { totalRevenue: 0, transactionCount: 0 }]),
  );

  for (const transaction of transactions) {
    const periodId = getPeriodIdForTimestamp(transaction.timestamp);
    if (!periodId) {
      continue;
    }

    const running = periodStats.get(periodId);
    if (!running) {
      continue;
    }

    running.totalRevenue += transaction.total;
    running.transactionCount += 1;
  }

  return CANONICAL_TIME_PERIODS.map((period) => ({
    periodId: period.id,
    periodLabel: period.label,
    totalRevenue: periodStats.get(period.id)?.totalRevenue ?? 0,
    transactionCount: periodStats.get(period.id)?.transactionCount ?? 0,
  }));
}

export function topProducts(transactions: Transaction[], limit = 10): RankedProductRevenue[] {
  const byProduct = new Map<string, RankedProductRevenue>();

  for (const transaction of transactions) {
    for (const item of transaction.items) {
      const existing = byProduct.get(item.product.id);
      const itemRevenue = item.product.price * item.quantity;

      if (existing) {
        existing.revenue += itemRevenue;
        existing.quantity += item.quantity;
      } else {
        byProduct.set(item.product.id, {
          productId: item.product.id,
          productName: item.product.name,
          revenue: itemRevenue,
          quantity: item.quantity,
        });
      }
    }
  }

  return Array.from(byProduct.values())
    .sort((a, b) => (b.revenue === a.revenue ? b.quantity - a.quantity : b.revenue - a.revenue))
    .slice(0, limit);
}

export function topCustomers(transactions: Transaction[], students: Student[], limit = 10): RankedCustomerRevenue[] {
  const studentNames = new Map(students.map((student) => [student.id, student.name]));
  const byCustomer = new Map<string, RankedCustomerRevenue>();

  for (const transaction of transactions) {
    if (!transaction.studentId) {
      continue;
    }

    const studentId = transaction.studentId;
    const existing = byCustomer.get(studentId);
    if (existing) {
      existing.revenue += transaction.total;
      existing.transactionCount += 1;
      continue;
    }

    byCustomer.set(studentId, {
      studentId,
      studentName: studentNames.get(studentId) ?? 'Unknown Student',
      revenue: transaction.total,
      transactionCount: 1,
    });
  }

  return Array.from(byCustomer.values())
    .sort((a, b) => (b.revenue === a.revenue
      ? b.transactionCount - a.transactionCount
      : b.revenue - a.revenue))
    .slice(0, limit);
}
