import { useMemo, useState } from 'react';
import type { Product, Transaction } from '../../App';
import { Card } from '../ui/card';
import { TimePeriodRevenueBarChart } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';
import { ProductAverageRevenueTable } from './ProductAverageRevenueTable';
import { CANONICAL_TIME_PERIODS } from './timePeriodAnalytics';
import { DateRangeSelector } from './DateRangeSelector';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import { filterByDateRange } from './aggregation';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
}

export type StatisticDateRange = 'thisMonth' | 'chosenMonth';

function formatMonthInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonthInputValue(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function getDateBounds(dateRange: StatisticDateRange, chosenMonthDate: Date): { start: Date; end: Date } {
  if (dateRange === 'chosenMonth') {
    const start = new Date(chosenMonthDate.getFullYear(), chosenMonthDate.getMonth(), 1);
    const end = new Date(chosenMonthDate.getFullYear(), chosenMonthDate.getMonth() + 1, 0);
    return { start, end };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

export function StatisticPage({ transactions, products }: StatisticPageProps) {
  const [dateRange, setDateRange] = useState<StatisticDateRange>('thisMonth');
  const [chosenMonth, setChosenMonth] = useState(() => formatMonthInputValue(new Date()));
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  const chosenMonthDate = useMemo(() => parseMonthInputValue(chosenMonth), [chosenMonth]);

  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateBounds(dateRange, chosenMonthDate);
    return filterByDateRange(transactions, start, end);
  }, [transactions, dateRange, chosenMonthDate]);

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Deterministic full-data analytics using transaction timestamps.</p>
          </div>

          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            chosenMonth={chosenMonth}
            onChosenMonthChange={setChosenMonth}
          />
        </Card>

        <WeekdayRevenueBarChart transactions={filteredTransactions} />

        <TimePeriodRevenueBarChart
          transactions={filteredTransactions}
          selectedPeriodId={selectedPeriodId}
          onSelectPeriod={setSelectedPeriodId}
        />

        <TimePeriodCumulativeLine
          transactions={filteredTransactions}
          selectedPeriodId={selectedPeriodId}
        />

        <ProductAverageRevenueTable
          transactions={filteredTransactions}
          products={products}
        />
      </div>
    </div>
  );
}
