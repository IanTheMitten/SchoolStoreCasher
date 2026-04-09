import type { Transaction } from '../../App';
import { getDayKey, getWeekKey, parseDayKey, getWeekdayRevenueByDate } from '../analytics/sharedAggregation';

export type StatisticDateRange = 'thisMonth' | 'chosenMonth' | 'sample4Weeks' | 'sample30Days';

export interface StatisticSamplingOptions {
  dateRange: StatisticDateRange;
  chosenMonthDate: Date;
  seed?: string;
}

export interface SampledTransactionDates {
  selected: Date[];
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
  return getWeekdayRevenueByDate(transactions);
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

export { getDayKey, parseDayKey };
