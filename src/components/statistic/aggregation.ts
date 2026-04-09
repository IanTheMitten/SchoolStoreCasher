import type { Student, Transaction } from '../../App';
import { CANONICAL_TIME_PERIODS, getPeriodIdForTimestamp } from './timePeriodAnalytics';

const WEEKDAY_LABELS = [
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
] as const;

function toLocalDayKey(timestamp: Date): string {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSchoolWeekday(timestamp: Date): boolean {
  const day = timestamp.getDay();
  return day >= 1 && day <= 5;
}

export function filterByDateRange(transactions: Transaction[], start?: Date | null, end?: Date | null): Transaction[] {
  const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : null;
  const endTime = end
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime()
    : null;

  return transactions.filter((transaction) => {
    const transactionTime = transaction.timestamp.getTime();
    if (startTime !== null && transactionTime < startTime) {
      return false;
    }
    if (endTime !== null && transactionTime > endTime) {
      return false;
    }
    return true;
  });
}

export interface WeekdayRevenueDatum {
  weekday: string;
  totalRevenue: number;
  avgRevenue: number;
  txCount: number;
  daysObserved: number;
}

export function revenueByWeekday(transactions: Transaction[]): WeekdayRevenueDatum[] {
  const weekdayBuckets = WEEKDAY_LABELS.map((weekday) => ({
    weekday: weekday.label,
    totalRevenue: 0,
    txCount: 0,
    dayKeys: new Set<string>(),
  }));

  for (const transaction of transactions) {
    // Explicit weekend exclusion for school-only weekday analytics.
    if (!isSchoolWeekday(transaction.timestamp)) {
      continue;
    }

    const dayOfWeek = transaction.timestamp.getDay();
    const bucket = weekdayBuckets[dayOfWeek - 1];
    if (!bucket) {
      continue;
    }

    bucket.totalRevenue += transaction.total;
    bucket.txCount += 1;
    bucket.dayKeys.add(toLocalDayKey(transaction.timestamp));
  }

  return weekdayBuckets.map((bucket) => {
    const daysObserved = bucket.dayKeys.size;

    return {
      weekday: bucket.weekday,
      totalRevenue: bucket.totalRevenue,
      avgRevenue: daysObserved > 0 ? bucket.totalRevenue / daysObserved : 0,
      txCount: bucket.txCount,
      daysObserved,
    };
  });
}

export interface TopRevenueDay {
  dayKey: string;
  revenue: number;
  txCount: number;
}

export function topDaysByRevenue(transactions: Transaction[], limit = 5): TopRevenueDay[] {
  const dayTotals = new Map<string, TopRevenueDay>();

  for (const transaction of transactions) {
    const dayKey = toLocalDayKey(transaction.timestamp);
    const existing = dayTotals.get(dayKey) ?? { dayKey, revenue: 0, txCount: 0 };
    existing.revenue += transaction.total;
    existing.txCount += 1;
    dayTotals.set(dayKey, existing);
  }

  return Array.from(dayTotals.values())
    .sort((a, b) => (b.revenue - a.revenue) || a.dayKey.localeCompare(b.dayKey))
    .slice(0, Math.max(0, limit));
}

export interface TimePeriodRevenueDatum {
  periodId: string;
  periodLabel: string;
  totalRevenue: number;
  transactionCount: number;
}

export function revenueByTimePeriod(transactions: Transaction[]): TimePeriodRevenueDatum[] {
  const totalsByPeriod = new Map<string, number>(CANONICAL_TIME_PERIODS.map((period) => [period.id, 0]));
  const countByPeriod = new Map<string, number>(CANONICAL_TIME_PERIODS.map((period) => [period.id, 0]));

  for (const transaction of transactions) {
    const periodId = getPeriodIdForTimestamp(transaction.timestamp);
    if (!periodId) {
      continue;
    }

    totalsByPeriod.set(periodId, (totalsByPeriod.get(periodId) ?? 0) + transaction.total);
    countByPeriod.set(periodId, (countByPeriod.get(periodId) ?? 0) + 1);
  }

  return CANONICAL_TIME_PERIODS.map((period) => ({
    periodId: period.id,
    periodLabel: period.label,
    totalRevenue: totalsByPeriod.get(period.id) ?? 0,
    transactionCount: countByPeriod.get(period.id) ?? 0,
  }));
}

export interface ProductRankingRow {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPct: number;
}

export function topProducts(transactions: Transaction[], limit = Number.POSITIVE_INFINITY): ProductRankingRow[] {
  const aggregates = new Map<string, ProductRankingRow>();

  transactions.forEach((transaction) => {
    transaction.items.forEach((item) => {
      const unitPrice = Number(item.product.price || 0);
      const unitCost = Number(item.product.unitCost || 0);
      const quantity = Number(item.quantity || 0);
      const lineRevenue = unitPrice * quantity;
      const lineProfit = (unitPrice - unitCost) * quantity;

      const existing = aggregates.get(item.product.id) ?? {
        productId: item.product.id,
        productName: item.product.name,
        unitsSold: 0,
        revenue: 0,
        profit: 0,
        marginPct: 0,
      };

      existing.unitsSold += quantity;
      existing.revenue += lineRevenue;
      existing.profit += lineProfit;
      aggregates.set(item.product.id, existing);
    });
  });

  return Array.from(aggregates.values())
    .map((row) => ({
      ...row,
      marginPct: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
    }))
    .sort((a, b) => (b.revenue - a.revenue) || a.productName.localeCompare(b.productName))
    .slice(0, Math.max(0, limit));
}

export interface CustomerRankingRow {
  studentId: string;
  studentName: string;
  revenue: number;
  txCount: number;
}

export function topCustomers(transactions: Transaction[], students: Student[], limit = 10): CustomerRankingRow[] {
  const studentNameById = new Map(students.map((student) => [student.id, student.name]));
  const aggregates = new Map<string, CustomerRankingRow>();

  for (const transaction of transactions) {
    if (!transaction.studentId) {
      continue;
    }

    const existing = aggregates.get(transaction.studentId) ?? {
      studentId: transaction.studentId,
      studentName: studentNameById.get(transaction.studentId) ?? transaction.studentId,
      revenue: 0,
      txCount: 0,
    };

    existing.revenue += transaction.total;
    existing.txCount += 1;
    aggregates.set(transaction.studentId, existing);
  }

  return Array.from(aggregates.values())
    .sort((a, b) => (b.revenue - a.revenue) || (b.txCount - a.txCount) || a.studentName.localeCompare(b.studentName))
    .slice(0, Math.max(0, limit));
}

export function getTransactionDayKey(timestamp: Date): string {
  return toLocalDayKey(timestamp);
}
