import type { Transaction } from '../../App';

export interface SampledTransactionDates {
  currentMonth: Date[];
  chosenMonth: Date[];
  randomSampleWeeks: Date[];
  randomTransactionDays: Date[];
  combined: Date[];
}

const MONDAY_FIRST_WEEKDAY_ORDER = [1, 2, 3, 4, 5] as const;

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= MONDAY_FIRST_WEEKDAY_ORDER[0] && day <= MONDAY_FIRST_WEEKDAY_ORDER[4];
}

function getWeekKey(date: Date): string {
  const weekAnchor = new Date(date);
  weekAnchor.setHours(0, 0, 0, 0);
  const currentDay = weekAnchor.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  weekAnchor.setDate(weekAnchor.getDate() + diff);
  return toDayKey(weekAnchor);
}

function pickRandom<T>(values: T[], count: number): T[] {
  if (values.length <= count) {
    return [...values];
  }

  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function getWeekdayRevenueByDate(transactions: Transaction[]): Map<string, number> {
  const revenueByDate = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (!isWeekday(transaction.timestamp)) {
      return;
    }

    const dayKey = toDayKey(transaction.timestamp);
    const runningTotal = revenueByDate.get(dayKey) ?? 0;
    revenueByDate.set(dayKey, runningTotal + transaction.total);
  });

  for (const [dayKey, amount] of revenueByDate.entries()) {
    if (amount <= 0) {
      revenueByDate.delete(dayKey);
    }
  }

  return revenueByDate;
}

export function getSampledTransactionDates(transactions: Transaction[], chosenMonthDate: Date): SampledTransactionDates {
  const revenueByDate = getWeekdayRevenueByDate(transactions);
  const allDays = Array.from(revenueByDate.keys());

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

  const randomWeeks = pickRandom(Array.from(weekGroups.keys()), 4);
  const randomSampleWeeks = randomWeeks
    .flatMap((weekKey) => weekGroups.get(weekKey) ?? [])
    .sort((a, b) => a.getTime() - b.getTime());

  const randomTransactionDays = pickRandom(allDays, 30)
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
