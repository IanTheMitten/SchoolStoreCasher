import type { Transaction } from '../../App';

export type StatisticDateRange = 'thisMonth' | 'chosenMonth' | 'sample4Weeks' | 'sample30Days';

export interface StatisticSamplingOptions {
  dateRange: StatisticDateRange;
  chosenMonthDate: Date;
  seed?: string;
}

export interface SampledTransactionDates {
  selected: Date[];
}

const WEEKDAY_START = 1;
const WEEKDAY_END = 5;

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= WEEKDAY_START && day <= WEEKDAY_END;
}

function getWeekKey(date: Date): string {
  const weekAnchor = new Date(date);
  weekAnchor.setHours(0, 0, 0, 0);
  const day = weekAnchor.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekAnchor.setDate(weekAnchor.getDate() + diff);
  return toDayKey(weekAnchor);
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSample<T>(values: T[], count: number, random: () => number): T[] {
  if (values.length <= count) {
    return [...values];
  }

  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

export function getEligibleWeekdayRevenueByDate(transactions: Transaction[]): Map<string, number> {
  const revenueByDate = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isWeekday(transaction.timestamp)) {
      continue;
    }

    const dayKey = toDayKey(transaction.timestamp);
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

export function getSampledTransactionDates(
  transactions: Transaction[],
  options: StatisticSamplingOptions,
): SampledTransactionDates {
  const eligibleRevenueByDate = getEligibleWeekdayRevenueByDate(transactions);
  const eligibleDayKeys = Array.from(eligibleRevenueByDate.keys()).sort();
  const eligibleDates = eligibleDayKeys.map(parseDayKey);

  const now = new Date();
  const random = createSeededRandom(options.seed ?? `${now.getFullYear()}-${now.getMonth() + 1}`);

  if (options.dateRange === 'thisMonth') {
    return {
      selected: eligibleDates.filter(
        (date) => date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(),
      ),
    };
  }

  if (options.dateRange === 'chosenMonth') {
    return {
      selected: eligibleDates.filter(
        (date) =>
          date.getFullYear() === options.chosenMonthDate.getFullYear() &&
          date.getMonth() === options.chosenMonthDate.getMonth(),
      ),
    };
  }

  if (options.dateRange === 'sample4Weeks') {
    const weekGroups = new Map<string, Date[]>();

    for (const date of eligibleDates) {
      const weekKey = getWeekKey(date);
      const existing = weekGroups.get(weekKey) ?? [];
      weekGroups.set(weekKey, [...existing, date]);
    }

    const selectedWeeks = pickSample(Array.from(weekGroups.keys()), 4, random);

    return {
      selected: selectedWeeks
        .flatMap((weekKey) => weekGroups.get(weekKey) ?? [])
        .sort((a, b) => a.getTime() - b.getTime()),
    };
  }

  return {
    selected: pickSample(eligibleDates, 30, random).sort((a, b) => a.getTime() - b.getTime()),
  };
}

export function getDayKey(date: Date): string {
  return toDayKey(date);
}
