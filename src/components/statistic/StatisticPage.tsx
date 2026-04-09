import { useMemo, useState } from 'react';
import type { Product, Student, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { TimePeriodRevenueBarChart } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';
import { TopProductsTable } from './TopProductsTable';
import { CANONICAL_TIME_PERIODS } from './timePeriodAnalytics';
import { DateRangeSelector, type StatisticDateRange } from './DateRangeSelector';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import { filterByDateRange } from './aggregation';
import { BestDaysTable } from './BestDaysTable';
import { TopCustomersTable } from './TopCustomersTable';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
  students: Student[];
}

function getDateRangeBounds(
  range: StatisticDateRange,
  customStart: Date | null,
  customEnd: Date | null,
): { start?: Date; end?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === 'allTime') {
    return {};
  }

  if (range === 'today') {
    return { start: today, end: today };
  }

  if (range === 'thisWeek') {
    const dayIndex = today.getDay();
    const daysSinceMonday = dayIndex === 0 ? 6 : dayIndex - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysSinceMonday);

    return { start: startOfWeek, end: today };
  }

  if (range === 'thisMonth') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: today,
    };
  }

  return {
    start: customStart ?? today,
    end: customEnd ?? customStart ?? today,
  };
}

export function StatisticPage({ transactions, products, students }: StatisticPageProps) {
  const { formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState<StatisticDateRange>('allTime');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  const { start, end } = useMemo(
    () => getDateRangeBounds(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd],
  );

  const filteredTransactions = useMemo(
    () => filterByDateRange(transactions, start, end),
    [transactions, start, end],
  );

  const totalRevenue = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0),
    [filteredTransactions],
  );
  const unitsSold = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + transaction.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    [filteredTransactions],
  );
  const transactionCount = filteredTransactions.length;
  const averageBasketSize = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  const kpiItems = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
    { label: 'Units Sold', value: unitsSold.toLocaleString() },
    { label: 'Transactions', value: transactionCount.toLocaleString() },
    { label: 'Avg Basket Size', value: formatCurrency(averageBasketSize) },
  ];

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Factual transaction analytics with a single filtered dataset.</p>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((item) => (
            <Card key={item.label} className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className="text-2xl text-gray-900 mt-1">{item.value}</p>
            </Card>
          ))}
        </div>

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

        <div className="grid gap-6 lg:grid-cols-2">
          <BestDaysTable transactions={filteredTransactions} />
          <TopCustomersTable transactions={filteredTransactions} students={students} />
        </div>
      </div>
    </div>
  );
}
