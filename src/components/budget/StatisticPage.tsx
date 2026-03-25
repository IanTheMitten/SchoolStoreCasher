import { useState } from 'react';
import type { Transaction } from '../../App';
import { DateRangeSelector } from './DateRangeSelector';
import type { DateRange } from './BudgetPage';
import { CANONICAL_PERIODS, TimePeriodRevenueBarChart, type CanonicalPeriodId } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';

interface StatisticPageProps {
  transactions: Transaction[];
}

export function StatisticPage({ transactions }: StatisticPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<CanonicalPeriodId | null>(CANONICAL_PERIODS[0]?.id ?? null);

  const normalizeRangeToDayBounds = (startDate: Date, endDate: Date = startDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const getDateRangeFilter = () => {
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
      case 'lastMonth':
        return normalizeRangeToDayBounds(
          new Date(now.getFullYear(), now.getMonth() - 1, 1),
          new Date(now.getFullYear(), now.getMonth(), 0)
        );
      case 'allTime': {
        const oldestRecordDate = transactions.length > 0
          ? new Date(Math.min(...transactions.map(transaction => transaction.timestamp.getTime())))
          : today;

        return normalizeRangeToDayBounds(oldestRecordDate, today);
      }
      case 'custom': {
        const customStartDate = customStart || today;
        const customEndDate = customEnd || customStartDate;

        return normalizeRangeToDayBounds(customStartDate, customEndDate);
      }
      default:
        return normalizeRangeToDayBounds(today);
    }
  };

  const range = getDateRangeFilter();

  const filteredTransactions = transactions.filter(
    transaction => transaction.timestamp >= range.start && transaction.timestamp <= range.end
  );

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <TimePeriodRevenueBarChart
            transactions={filteredTransactions}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
          />
          <TimePeriodCumulativeLine
            transactions={filteredTransactions}
            selectedPeriod={selectedPeriod}
          />
        </div>
      </div>
    </div>
  );
}
