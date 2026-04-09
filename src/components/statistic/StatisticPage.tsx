import { useMemo, useState } from 'react';
import type { Product, Student, Transaction } from '../../App';
import { Card } from '../ui/card';
import { TimePeriodRevenueBarChart } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';
import { TopProductsTable } from './TopProductsTable';
import { CANONICAL_TIME_PERIODS } from './timePeriodAnalytics';
import { DateRangeSelector, type StatisticDateRange } from './DateRangeSelector';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import { filterByDateRange } from './aggregation';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
  students: Student[];
}

function formatMonthInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonthInputValue(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function getDateRangeBounds(range: StatisticDateRange, chosenMonthDate: Date): { start?: Date; end?: Date } {
  if (range === 'allTime') {
    return {};
  }

  if (range === 'thisMonth') {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }

  return {
    start: new Date(chosenMonthDate.getFullYear(), chosenMonthDate.getMonth(), 1),
    end: new Date(chosenMonthDate.getFullYear(), chosenMonthDate.getMonth() + 1, 0),
  };
}

export function StatisticPage({ transactions, products, students: _students }: StatisticPageProps) {
  const [dateRange, setDateRange] = useState<StatisticDateRange>('allTime');
  const [chosenMonth, setChosenMonth] = useState(() => formatMonthInputValue(new Date()));
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  const chosenMonthDate = useMemo(() => parseMonthInputValue(chosenMonth), [chosenMonth]);
  const { start, end } = useMemo(() => getDateRangeBounds(dateRange, chosenMonthDate), [dateRange, chosenMonthDate]);
  const filteredTransactions = useMemo(
    () => filterByDateRange(transactions, start, end),
    [transactions, start, end],
  );

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Weekday and product analytics from transaction data.</p>
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

        <TopProductsTable
          transactions={filteredTransactions}
          products={products}
        />
      </div>
    </div>
  );
}
