import { useMemo, useState } from 'react';
import type { Product, Transaction } from '../../App';
import { Card } from '../ui/card';
import { TimePeriodRevenueBarChart } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';
import { ProductAverageRevenueTable } from './ProductAverageRevenueTable';
import { CANONICAL_TIME_PERIODS } from './timePeriodAnalytics';
import { DateRangeSelector } from './DateRangeSelector';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import type { StatisticDateRange, StatisticSamplingOptions } from './analyticsSampling';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
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

export function StatisticPage({ transactions, products }: StatisticPageProps) {
  const [dateRange, setDateRange] = useState<StatisticDateRange>('thisMonth');
  const [chosenMonth, setChosenMonth] = useState(() => formatMonthInputValue(new Date()));
  const [samplingSeed, setSamplingSeed] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  const chosenMonthDate = useMemo(() => parseMonthInputValue(chosenMonth), [chosenMonth]);

  const samplingOptions = useMemo<StatisticSamplingOptions>(() => ({
    dateRange,
    chosenMonthDate,
    seed: samplingSeed || undefined,
  }), [dateRange, chosenMonthDate, samplingSeed]);

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Weekday average revenue analytics sampled from eligible transaction days.</p>
          </div>

          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            chosenMonth={chosenMonth}
            onChosenMonthChange={setChosenMonth}
            seed={samplingSeed}
            onSeedChange={setSamplingSeed}
          />
        </Card>

        <WeekdayRevenueBarChart transactions={transactions} samplingOptions={samplingOptions} />

        <TimePeriodRevenueBarChart
          transactions={transactions}
          selectedPeriodId={selectedPeriodId}
          onSelectPeriod={setSelectedPeriodId}
        />

        <TimePeriodCumulativeLine
          transactions={transactions}
          samplingOptions={samplingOptions}
          selectedPeriodId={selectedPeriodId}
        />

        <ProductAverageRevenueTable
          transactions={transactions}
          products={products}
          samplingOptions={samplingOptions}
        />
      </div>
    </div>
  );
}
