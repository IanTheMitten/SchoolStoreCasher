import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';
import type { StatisticSamplingOptions } from './analyticsSampling';

interface WeekdayRevenueBarChartProps {
  transactions: Transaction[];
  samplingOptions: StatisticSamplingOptions;
}

interface WeekdayRevenueDatum {
  weekday: string;
  totalRevenue: number;
  avgRevenue: number;
  txCount: number;
  daysObserved: number;
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

export function WeekdayRevenueBarChart({ transactions, samplingOptions: _samplingOptions }: WeekdayRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const chartData = useMemo<WeekdayRevenueDatum[]>(() => {
    const weekdayBuckets = WEEKDAY_LABELS.map((weekday) => ({
      weekday: weekday.label,
      totalRevenue: 0,
      txCount: 0,
      dayKeys: new Set<string>(),
    }));

    for (const transaction of transactions) {
      const dayOfWeek = transaction.timestamp.getDay();
      const targetBucket = weekdayBuckets[dayOfWeek - 1];

      if (!targetBucket) {
        continue;
      }

      targetBucket.totalRevenue += transaction.total;
      targetBucket.txCount += 1;
      targetBucket.dayKeys.add(getDayKey(transaction.timestamp));
    }

    return weekdayBuckets.map((bucket) => {
      const daysObserved = bucket.dayKeys.size;

      return {
        weekday: bucket.weekday,
        totalRevenue: bucket.totalRevenue,
        avgRevenue: daysObserved > 0 ? bucket.totalRevenue / daysObserved : 0,
        txCount: bucket.txCount,
        daysObserved,
      };
    });
  }, [transactions]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Average Revenue by Weekday</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="weekday" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            content={({ active, payload, label }: TooltipProps<number, string>) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }

              const datum = payload[0].payload as WeekdayRevenueDatum;

              return (
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px 10px',
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</p>
                  <p>Total Revenue: {formatCurrency(datum.totalRevenue)}</p>
                  <p>Avg Revenue: {formatCurrency(datum.avgRevenue)}</p>
                  <p>Tx Count: {datum.txCount}</p>
                  <p>Days Observed: {datum.daysObserved}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="avgRevenue" name="Average Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
