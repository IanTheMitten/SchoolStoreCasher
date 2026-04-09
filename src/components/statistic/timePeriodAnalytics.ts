import type { Transaction } from '../../App';
import { TIME_PERIODS, toDayKey } from './aggregation';

export interface TimePeriodDefinition {
  id: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
}

export const CANONICAL_TIME_PERIODS: TimePeriodDefinition[] = TIME_PERIODS.map((period) => ({
  id: period.id,
  label: period.label,
  startMinutes: period.start,
  endMinutes: period.end,
}));

export interface PeriodCumulativePoint {
  pointLabel: string;
  cumulativeRevenue: number;
  timestamp: Date;
  transactionTotal: number;
}

function getLocalMinutesSinceMidnight(timestamp: Date): number {
  return timestamp.getHours() * 60 + timestamp.getMinutes();
}

export function getPeriodIdForTimestamp(timestamp: Date): string | null {
  const localMinutes = getLocalMinutesSinceMidnight(timestamp);
  const matchedPeriod = CANONICAL_TIME_PERIODS.find(
    (period) => localMinutes >= period.startMinutes && localMinutes < period.endMinutes,
  );

  return matchedPeriod?.id ?? null;
}

function formatCumulativePointLabel(timestamp: Date, index: number): string {
  const day = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${index}. ${day} ${time}`;
}

export function getSelectedPeriodCumulativeSeries(
  transactions: Transaction[],
  selectedPeriodId: string,
): { dayCount: number; points: PeriodCumulativePoint[] } {
  const dayCount = new Set(transactions.map((transaction) => toDayKey(transaction.timestamp))).size;

  const selectedTransactions = transactions
    .filter((transaction) => getPeriodIdForTimestamp(transaction.timestamp) === selectedPeriodId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let cumulativeRevenue = 0;
  const points: PeriodCumulativePoint[] = [
    {
      pointLabel: '0. Start',
      cumulativeRevenue: 0,
      timestamp: selectedTransactions[0]?.timestamp ?? new Date(),
      transactionTotal: 0,
    },
  ];

  selectedTransactions.forEach((transaction, index) => {
    cumulativeRevenue += transaction.total;
    points.push({
      pointLabel: formatCumulativePointLabel(transaction.timestamp, index + 1),
      cumulativeRevenue,
      timestamp: transaction.timestamp,
      transactionTotal: transaction.total,
    });
  });

  return {
    dayCount,
    points,
  };
}
