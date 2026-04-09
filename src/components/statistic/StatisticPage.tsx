import { useState } from 'react';
import type { Product, Transaction } from '../../App';
import { Card } from '../ui/card';
import { TimePeriodRevenueBarChart } from './TimePeriodRevenueBarChart';
import { TimePeriodCumulativeLine } from './TimePeriodCumulativeLine';
import { ProductAverageRevenueTable } from './ProductAverageRevenueTable';
import { CANONICAL_TIME_PERIODS } from './timePeriodAnalytics';
import { DateRangeSelector } from './DateRangeSelector';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import type { StatisticSamplingOptions } from './analyticsSampling';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
}

export function StatisticPage({ transactions, products }: StatisticPageProps) {
  const [samplingOptions, setSamplingOptions] = useState<StatisticSamplingOptions>({
    dateRange: 'thisMonth',
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Weekday average revenue analytics for eligible transaction days.</p>
          </div>

          <DateRangeSelector onRangeResolvedChange={setSamplingOptions} />
        </Card>

        <WeekdayRevenueBarChart transactions={transactions} samplingOptions={samplingOptions} />

        <TimePeriodRevenueBarChart
          transactions={transactions}
          samplingOptions={samplingOptions}
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
