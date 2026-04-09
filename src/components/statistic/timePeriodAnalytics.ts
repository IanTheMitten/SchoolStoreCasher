import type { Transaction } from '../../App';

export interface TimePeriodDefinition {
  id: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
}

export const CANONICAL_TIME_PERIODS: TimePeriodDefinition[] = [
  { id: '09:00-09:10', label: '9:00–9:10', startMinutes: 9 * 60, endMinutes: 9 * 60 + 10 },
  { id: '09:55-10:05', label: '9:55–10:05', startMinutes: 9 * 60 + 55, endMinutes: 10 * 60 + 5 },
  { id: '10:50-11:00', label: '10:50–11:00', startMinutes: 10 * 60 + 50, endMinutes: 11 * 60 },
  { id: '11:45-12:40', label: '11:45–12:40', startMinutes: 11 * 60 + 45, endMinutes: 12 * 60 + 40 },
  { id: '13:10-13:20', label: '1:10–1:20', startMinutes: 13 * 60 + 10, endMinutes: 13 * 60 + 20 },
  { id: '14:05-14:15', label: '2:05–2:15', startMinutes: 14 * 60 + 5, endMinutes: 14 * 60 + 15 },
  { id: '15:00-15:10', label: '3:00–3:10', startMinutes: 15 * 60, endMinutes: 15 * 60 + 10 },
  { id: '16:00-24:00', label: '4:00–24:00', startMinutes: 16 * 60, endMinutes: 24 * 60 },
];

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
): { dataDayCount: number; points: PeriodCumulativePoint[] } {
  const selectedTransactions = transactions
    .filter((transaction) => getPeriodIdForTimestamp(transaction.timestamp) === selectedPeriodId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const dayCount = new Set(selectedTransactions.map((tx) => {
    const date = tx.timestamp;
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  })).size;

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
    dataDayCount: dayCount,
    points,
  };
}
