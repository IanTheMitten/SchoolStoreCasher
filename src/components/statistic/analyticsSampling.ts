import type { Transaction } from '../../App';

export type StatisticDateRange = 'today' | 'thisWeek' | 'thisMonth' | 'allTime' | 'custom';

export interface StatisticSamplingOptions {
  dateRange: StatisticDateRange;
  startDate?: Date;
  endDate?: Date;
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

function isWithinRange(date: Date, options: StatisticSamplingOptions): boolean {
  const timestamp = date.getTime();

  if (options.startDate && timestamp < options.startDate.getTime()) {
    return false;
  }

  if (options.endDate && timestamp > options.endDate.getTime()) {
    return false;
  }

  return true;
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

  return {
    selected: eligibleDates
      .filter((date) => isWithinRange(date, options))
      .sort((a, b) => a.getTime() - b.getTime()),
  };
}

export function getDayKey(date: Date): string {
  return toDayKey(date);
}
