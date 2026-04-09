import type { Student, Transaction } from '../../App';
import { CANONICAL_TIME_PERIODS, getPeriodIdForTimestamp } from './timePeriodAnalytics';
import {
  aggregateWeekdayRevenueFromTransactions,
  toDayKey,
  type WeekdayRevenueFromTransactions,
} from '../analytics/sharedAggregation';


function toLocalDayKey(timestamp: Date): string {
  return toDayKey(timestamp);
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
  return aggregateWeekdayRevenueFromTransactions(transactions).map((datum: WeekdayRevenueFromTransactions) => ({
    weekday: datum.weekday,
    totalRevenue: datum.totalRevenue,
    avgRevenue: datum.avgRevenue,
    txCount: datum.txCount,
    daysObserved: datum.daysObserved,
  }));
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
  customerKey: string;
  customerId: string;
  customerType: 'student' | 'teacher';
  customerName: string;
  grade?: string;
  revenue: number;
  visits: number;
  avgSpendPerVisit: number;
}

export function topCustomers(transactions: Transaction[], students: Student[], limit = 10): CustomerRankingRow[] {
  const studentById = new Map(students.map((student) => [student.id, student]));
  const aggregates = new Map<string, CustomerRankingRow>();

  for (const transaction of transactions) {
    if (!transaction.customerId || !transaction.customerType) {
      continue;
    }

    const customerKey = `${transaction.customerType}:${transaction.customerId}`;
    const student = transaction.customerType === 'student' ? studentById.get(transaction.customerId) : undefined;
    const existing = aggregates.get(customerKey) ?? {
      customerKey,
      customerType: transaction.customerType,
      customerId: transaction.customerId,
      customerName:
        transaction.customerName ??
        student?.name ??
        transaction.customerId,
      grade: student?.grade,
      revenue: 0,
      visits: 0,
      avgSpendPerVisit: 0,
    };

    existing.revenue += transaction.total;
    existing.visits += 1;
    aggregates.set(customerKey, existing);
  }

  return Array.from(aggregates.values())
    .map((row) => ({
      ...row,
      avgSpendPerVisit: row.visits > 0 ? row.revenue / row.visits : 0,
    }))
    .sort((a, b) => (b.revenue - a.revenue) || (b.visits - a.visits) || a.customerName.localeCompare(b.customerName))
    .slice(0, Math.max(0, limit));
}

export function getTransactionDayKey(timestamp: Date): string {
  return toLocalDayKey(timestamp);
}
