import type { Transaction } from '../../App';

export const WEEKDAY_LABELS = [
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
] as const;

export interface WeekdayRevenueBase {
  weekday: string;
  totalRevenue: number;
  avgRevenue: number;
}

export interface WeekdayRevenueFromTransactions extends WeekdayRevenueBase {
  txCount: number;
  daysObserved: number;
}

export interface WeekdayRevenueFromSampledDates extends WeekdayRevenueBase {
  dayCount: number;
}

export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isSchoolWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function getWeekdayRevenueByDate(transactions: Transaction[]): Map<string, number> {
  const revenueByDate = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isSchoolWeekday(transaction.timestamp)) {
      continue;
    }

    const dayKey = toDayKey(transaction.timestamp);
    revenueByDate.set(dayKey, (revenueByDate.get(dayKey) ?? 0) + transaction.total);
  }

  for (const [dayKey, amount] of revenueByDate.entries()) {
    if (amount <= 0) {
      revenueByDate.delete(dayKey);
    }
  }

  return revenueByDate;
}

export function aggregateWeekdayRevenueFromSampledDates(
  sampledDates: Date[],
  revenueByDate: Map<string, number>,
): WeekdayRevenueFromSampledDates[] {
  const buckets = WEEKDAY_LABELS.map((weekday) => ({
    weekday: weekday.label,
    totalRevenue: 0,
    dayCount: 0,
  }));

  for (const sampleDate of sampledDates) {
    const targetBucket = buckets[sampleDate.getDay() - 1];
    if (!targetBucket) {
      continue;
    }

    const dayRevenue = revenueByDate.get(toDayKey(sampleDate)) ?? 0;
    if (dayRevenue <= 0) {
      continue;
    }

    targetBucket.totalRevenue += dayRevenue;
    targetBucket.dayCount += 1;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    avgRevenue: bucket.dayCount > 0 ? bucket.totalRevenue / bucket.dayCount : 0,
  }));
}

export function aggregateWeekdayRevenueFromTransactions(
  transactions: Transaction[],
): WeekdayRevenueFromTransactions[] {
  const buckets = WEEKDAY_LABELS.map((weekday) => ({
    weekday: weekday.label,
    totalRevenue: 0,
    txCount: 0,
    dayKeys: new Set<string>(),
  }));

  for (const transaction of transactions) {
    if (!isSchoolWeekday(transaction.timestamp)) {
      continue;
    }

    const targetBucket = buckets[transaction.timestamp.getDay() - 1];
    if (!targetBucket) {
      continue;
    }

    targetBucket.totalRevenue += transaction.total;
    targetBucket.txCount += 1;
    targetBucket.dayKeys.add(toDayKey(transaction.timestamp));
  }

  return buckets.map((bucket) => {
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
