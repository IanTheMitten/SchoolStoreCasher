import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';
// Keep weekday aggregation sourced from sharedAggregation so budget/statistic charts stay in sync.
import { aggregateWeekdayRevenueFromSampledDates, getWeekdayRevenueByDate } from '../analytics/sharedAggregation';
import { getSampledTransactionDates } from './analyticsSampling';

interface WeekdayRevenueBarChartProps {
  transactions: Transaction[];
  chosenMonthDate: Date;
}

export function WeekdayRevenueBarChart({ transactions, chosenMonthDate }: WeekdayRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const sampled = useMemo(() => getSampledTransactionDates(transactions, chosenMonthDate), [transactions, chosenMonthDate]);

  const chartData = useMemo(() => {
    const revenueByDate = getWeekdayRevenueByDate(transactions);
    return aggregateWeekdayRevenueFromSampledDates(sampled.combined, revenueByDate);
  }, [sampled, transactions]);

  const sampledDaysCount = sampled.combined.length;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Average Revenue by Weekday</h3>
        <p className="text-sm text-gray-600 mt-1">
          Calculated from {sampledDaysCount} sampled weekday transaction day{sampledDaysCount === 1 ? '' : 's'}.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="weekday" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => `${label} average`}
          />
          <Bar dataKey="avgRevenue" name="Average Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
