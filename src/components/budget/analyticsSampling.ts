import type { Expense, Transaction } from '../../App';

export type AnalyticsDateRange =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'thisMonth'
  | 'chosenMonth'
  | 'lastMonth'
  | 'sample4Weeks'
  | 'sample30Days'
  | 'allTime'
  | 'custom';

export interface AnalyticsSelectionOptions {
  transactions: Transaction[];
  expenses: Expense[];
  dateRange: AnalyticsDateRange;
  customStart?: Date | null;
  customEnd?: Date | null;
  chosenMonth?: Date | null;
  randomSeed?: string | null;
}

export interface AnalyticsSelectionResult {
  filteredTransactions: Transaction[];
  filteredExpenses: Expense[];
  selectedDayKeys: Set<string>;
  range: { start: Date; end: Date };
}

const SESSION_RANDOM_SEED = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

function normalizeRangeToDayBounds(startDate: Date, endDate: Date = startDate): { start: Date; end: Date } {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekKey(date: Date): string {
  const weekAnchor = new Date(date);
  weekAnchor.setHours(0, 0, 0, 0);
  const currentDay = weekAnchor.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  weekAnchor.setDate(weekAnchor.getDate() + diff);
  return toDayKey(weekAnchor);
}

function stringToSeed(seedText: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRandom(seedText: string): () => number {
  let state = stringToSeed(seedText) || 1;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickRandom<T>(values: T[], count: number, random: () => number): T[] {
  if (values.length <= count) {
    return [...values];
  }

  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function getEligibleWeekdayDayKeys(transactions: Transaction[]): string[] {
  const revenueByDate = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (!isWeekday(transaction.timestamp)) {
      return;
    }

    const dayKey = toDayKey(transaction.timestamp);
    const runningTotal = revenueByDate.get(dayKey) ?? 0;
    revenueByDate.set(dayKey, runningTotal + transaction.total);
  });

  return Array.from(revenueByDate.entries())
    .filter(([, amount]) => amount > 0)
    .map(([dayKey]) => dayKey)
    .sort();
}

function selectDayKeysInRange(eligibleDayKeys: string[], range: { start: Date; end: Date }): Set<string> {
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  return new Set(
    eligibleDayKeys.filter((dayKey) => {
      const day = parseDayKey(dayKey);
      const dayStart = normalizeRangeToDayBounds(day).start.getTime();
      return dayStart >= startTime && dayStart <= endTime;
    })
  );
}

function getDefaultRange(dateRange: AnalyticsDateRange, transactions: Transaction[], expenses: Expense[], customStart?: Date | null, customEnd?: Date | null, chosenMonth?: Date | null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateRange) {
    case 'today':
      return normalizeRangeToDayBounds(today);
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return normalizeRangeToDayBounds(yesterday);
    }
    case 'last7days': {
      const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return normalizeRangeToDayBounds(week, today);
    }
    case 'thisMonth':
      return normalizeRangeToDayBounds(new Date(now.getFullYear(), now.getMonth(), 1), today);
    case 'chosenMonth': {
      const monthDate = chosenMonth ?? today;
      return normalizeRangeToDayBounds(
        new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      );
    }
    case 'lastMonth':
      return normalizeRangeToDayBounds(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 0)
      );
    case 'allTime': {
      const oldestTransaction = transactions.reduce<Date | null>((oldest, transaction) => {
        if (!oldest || transaction.timestamp < oldest) {
          return transaction.timestamp;
        }
        return oldest;
      }, null);

      const oldestExpense = expenses.reduce<Date | null>((oldest, expense) => {
        if (!oldest || expense.date < oldest) {
          return expense.date;
        }
        return oldest;
      }, null);

      const candidates = [oldestTransaction, oldestExpense].filter((date): date is Date => Boolean(date));
      const oldestRecordDate =
        candidates.length > 0 ? new Date(Math.min(...candidates.map((date) => date.getTime()))) : today;

      return normalizeRangeToDayBounds(oldestRecordDate, today);
    }
    case 'custom': {
      const customStartDate = customStart || today;
      const customEndDate = customEnd || customStartDate;
      return normalizeRangeToDayBounds(customStartDate, customEndDate);
    }
    case 'sample4Weeks':
    case 'sample30Days':
    default:
      return normalizeRangeToDayBounds(today);
  }
}

export function getAnalyticsSelection({
  transactions,
  expenses,
  dateRange,
  customStart = null,
  customEnd = null,
  chosenMonth = null,
  randomSeed = null,
}: AnalyticsSelectionOptions): AnalyticsSelectionResult {
  const eligibleDayKeys = getEligibleWeekdayDayKeys(transactions);
  const deterministicRandom = createDeterministicRandom(randomSeed || SESSION_RANDOM_SEED);

  const weekGroups = new Map<string, string[]>();
  eligibleDayKeys.forEach((dayKey) => {
    const date = parseDayKey(dayKey);
    const weekKey = getWeekKey(date);
    const existing = weekGroups.get(weekKey) ?? [];
    weekGroups.set(weekKey, [...existing, dayKey]);
  });

  const defaultRange = getDefaultRange(dateRange, transactions, expenses, customStart, customEnd, chosenMonth);

  let selectedDayKeys = new Set<string>();
  if (dateRange === 'sample4Weeks') {
    const randomWeeks = pickRandom(Array.from(weekGroups.keys()), 4, deterministicRandom);
    selectedDayKeys = new Set(randomWeeks.flatMap((weekKey) => weekGroups.get(weekKey) ?? []));
  } else if (dateRange === 'sample30Days') {
    selectedDayKeys = new Set(pickRandom(eligibleDayKeys, 30, deterministicRandom));
  } else {
    selectedDayKeys = selectDayKeysInRange(eligibleDayKeys, defaultRange);
  }

  const selectedDates = Array.from(selectedDayKeys).map(parseDayKey).sort((a, b) => a.getTime() - b.getTime());
  const range =
    selectedDates.length > 0
      ? normalizeRangeToDayBounds(selectedDates[0], selectedDates[selectedDates.length - 1])
      : defaultRange;

  const filteredTransactions = transactions.filter((transaction) => selectedDayKeys.has(toDayKey(transaction.timestamp)));
  const filteredExpenses = expenses.filter((expense) => selectedDayKeys.has(toDayKey(expense.date)));

  return {
    filteredTransactions,
    filteredExpenses,
    selectedDayKeys,
    range,
  };
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

export function getDayKeyFromDate(date: Date): string {
  return toDayKey(date);
}
