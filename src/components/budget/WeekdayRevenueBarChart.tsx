import { useMemo, useState } from 'react';
import type { Transaction } from '../../App';
import { CANONICAL_PERIODS, TimePeriodRevenueBarChart, type CanonicalPeriodId } from './TimePeriodRevenueBarChart';

interface WeekdayRevenueBarChartProps {
  transactions: Transaction[];
  chosenMonthDate: Date;
}

export function WeekdayRevenueBarChart({ transactions, chosenMonthDate }: WeekdayRevenueBarChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<CanonicalPeriodId | null>(CANONICAL_PERIODS[0]?.id ?? null);

  const monthTransactions = useMemo(() => {
    const year = chosenMonthDate.getFullYear();
    const month = chosenMonthDate.getMonth();

    return transactions.filter(transaction => (
      transaction.timestamp.getFullYear() === year && transaction.timestamp.getMonth() === month
    ));
  }, [transactions, chosenMonthDate]);

  return (
    <TimePeriodRevenueBarChart
      transactions={monthTransactions}
      selectedPeriod={selectedPeriod}
      onSelectPeriod={setSelectedPeriod}
    />
  );
}
