import { useMemo, useState } from 'react';
import type { Student, Transaction } from '../../App';
import { Card } from '../ui/card';
import { DateRangeSelector } from '../budget/DateRangeSelector';
import type { DateRange } from '../budget/BudgetPage';
import { TimePeriodRevenueBarChart } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import { CANONICAL_TIME_PERIODS } from './timePeriodAnalytics';
import { KPIRow } from './KPIRow';
import { TopProductsTable } from './TopProductsTable';
import { BestDaysTable } from './BestDaysTable';
import { TopCustomersTable } from './TopCustomersTable';
import { filterByDateRange, getDateRangeBounds } from './aggregation';

interface StatisticPageProps {
  transactions: Transaction[];
  students: Student[];
}

export function StatisticPage({ transactions, students }: StatisticPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  const range = useMemo(
    () => getDateRangeBounds(dateRange, transactions, customStart, customEnd),
    [dateRange, transactions, customStart, customEnd],
  );

  const filteredTransactions = useMemo(
    () => filterByDateRange(transactions, range.start, range.end),
    [transactions, range.start, range.end],
  );

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Direct aggregation over real transactions — no sampling.</p>
          </div>

          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </Card>

        <KPIRow transactions={filteredTransactions} />

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

        <div className="grid gap-6 xl:grid-cols-2">
          <TopProductsTable transactions={filteredTransactions} />
          <BestDaysTable transactions={filteredTransactions} />
        </div>

        <TopCustomersTable transactions={filteredTransactions} students={students} />
      </div>
    </div>
  );
}
