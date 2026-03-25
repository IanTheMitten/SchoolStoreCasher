import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';
import { getSampledTransactionDates, getWeekdayRevenueByDate } from './analyticsSampling';

interface WeekdayRevenueBarChartProps {
  transactions: Transaction[];
  chosenMonthDate: Date;
}

const WEEKDAY_LABELS = [
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
];

function getDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function WeekdayRevenueBarChart({ transactions, chosenMonthDate }: WeekdayRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const sampled = useMemo(() => getSampledTransactionDates(transactions, chosenMonthDate), [transactions, chosenMonthDate]);

  const chartData = useMemo(() => {
    const revenueByDate = getWeekdayRevenueByDate(transactions);

    const weekdayBuckets = WEEKDAY_LABELS.map((weekday) => ({
      weekday: weekday.label,
      totalRevenue: 0,
      dayCount: 0,
      avgRevenue: 0,
    }));

    sampled.combined.forEach((sampleDate) => {
      const dayOfWeek = sampleDate.getDay();
      const targetBucket = weekdayBuckets[dayOfWeek - 1];

      if (!targetBucket) {
        return;
      }

      const dayRevenue = revenueByDate.get(getDayKey(sampleDate)) ?? 0;
      if (dayRevenue <= 0) {
        return;
      }

      targetBucket.totalRevenue += dayRevenue;
      targetBucket.dayCount += 1;
    });

    return weekdayBuckets.map((bucket) => ({
      ...bucket,
      avgRevenue: bucket.dayCount > 0 ? bucket.totalRevenue / bucket.dayCount : 0,
    }));
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
