import type { Transaction } from '../../App';

export const WEEKDAY_LABELS = [
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
] as const;

const WEEKDAY_START = WEEKDAY_LABELS[0].dayIndex;
const WEEKDAY_END = WEEKDAY_LABELS[WEEKDAY_LABELS.length - 1].dayIndex;

export interface WeekdayRevenueBucket {
  weekday: string;
  totalRevenue: number;
  dayCount: number;
  avgRevenue: number;
}

export function getDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= WEEKDAY_START && day <= WEEKDAY_END;
}

export function getWeekKey(date: Date): string {
  const weekAnchor = new Date(date);
  weekAnchor.setHours(0, 0, 0, 0);
  const day = weekAnchor.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekAnchor.setDate(weekAnchor.getDate() + diff);
  return getDayKey(weekAnchor);
}

export function getWeekdayRevenueByDate(transactions: Transaction[]): Map<string, number> {
  const revenueByDate = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isWeekday(transaction.timestamp)) {
      continue;
    }

    const dayKey = getDayKey(transaction.timestamp);
    const runningTotal = revenueByDate.get(dayKey) ?? 0;
    revenueByDate.set(dayKey, runningTotal + transaction.total);
  }

  for (const [dayKey, total] of revenueByDate.entries()) {
    if (total <= 0) {
      revenueByDate.delete(dayKey);
    }
  }

  return revenueByDate;
}

export function buildWeekdayAverageRevenueChartData(
  sampledDates: Date[],
  revenueByDate: Map<string, number>,
): WeekdayRevenueBucket[] {
  const weekdayBuckets = WEEKDAY_LABELS.map((weekday) => ({
    weekday: weekday.label,
    totalRevenue: 0,
    dayCount: 0,
    avgRevenue: 0,
  }));

  for (const sampleDate of sampledDates) {
    const dayOfWeek = sampleDate.getDay();
    const targetBucket = weekdayBuckets[dayOfWeek - 1];

    if (!targetBucket) {
      continue;
    }

    const dayRevenue = revenueByDate.get(getDayKey(sampleDate)) ?? 0;
    if (dayRevenue <= 0) {
      continue;
    }

    targetBucket.totalRevenue += dayRevenue;
    targetBucket.dayCount += 1;
  }

  return weekdayBuckets.map((bucket) => ({
    ...bucket,
    avgRevenue: bucket.dayCount > 0 ? bucket.totalRevenue / bucket.dayCount : 0,
  }));
}
