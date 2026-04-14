import type { Transaction } from '../../App';
import { getWeekdayRevenueByDate, parseDayKey, toDayKey } from '../analytics/sharedAggregation';


export interface SampledTransactionDates {
  currentMonth: Date[];
  chosenMonth: Date[];
  randomSampleWeeks: Date[];
  randomTransactionDays: Date[];
  combined: Date[];
}

function getWeekKey(date: Date): string {
  const weekAnchor = new Date(date);
  weekAnchor.setHours(0, 0, 0, 0);
  const currentDay = weekAnchor.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  weekAnchor.setDate(weekAnchor.getDate() + diff);
  return toDayKey(weekAnchor);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(values: T[], count: number, rng: () => number): T[] {
  if (values.length <= count) {
    return [...values];
  }

  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function getSampledTransactionDates(transactions: Transaction[], chosenMonthDate: Date): SampledTransactionDates {
  const revenueByDate = getWeekdayRevenueByDate(transactions);
  const allDays = Array.from(revenueByDate.keys()).sort();
  const sampleSeed = hashString(`${allDays.join('|')}|${toDayKey(chosenMonthDate)}|${transactions.length}`);
  const rng = createSeededRng(sampleSeed);

  const now = new Date();
  const currentMonth = allDays
    .filter((dayKey) => {
      const day = parseDayKey(dayKey);
      return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth();
    })
    .map(parseDayKey);

  const chosenMonth = allDays
    .filter((dayKey) => {
      const day = parseDayKey(dayKey);
      return day.getFullYear() === chosenMonthDate.getFullYear() && day.getMonth() === chosenMonthDate.getMonth();
    })
    .map(parseDayKey);

  const weekGroups = new Map<string, Date[]>();
  allDays.forEach((dayKey) => {
    const date = parseDayKey(dayKey);
    const weekKey = getWeekKey(date);
    const existing = weekGroups.get(weekKey) ?? [];
    weekGroups.set(weekKey, [...existing, date]);
  });

  const randomWeeks = pickRandom(Array.from(weekGroups.keys()).sort(), 4, rng);
  const randomSampleWeeks = randomWeeks
    .flatMap((weekKey) => weekGroups.get(weekKey) ?? [])
    .sort((a, b) => a.getTime() - b.getTime());

  const randomTransactionDays = pickRandom(allDays, 30, rng)
    .map(parseDayKey)
    .sort((a, b) => a.getTime() - b.getTime());

  const combinedMap = new Map<string, Date>();
  [...currentMonth, ...chosenMonth, ...randomSampleWeeks, ...randomTransactionDays].forEach((date) => {
    combinedMap.set(toDayKey(date), date);
  });

  const combined = Array.from(combinedMap.values()).sort((a, b) => a.getTime() - b.getTime());

  return {
    currentMonth,
    chosenMonth,
    randomSampleWeeks,
    randomTransactionDays,
    combined,
  };
}
