import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';
import { revenueByWeekday } from './aggregation';

interface WeekdayRevenueBarChartProps {
  transactions: Transaction[];
}

export function WeekdayRevenueBarChart({ transactions }: WeekdayRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const chartData = useMemo(() => revenueByWeekday(transactions), [transactions]);
  const totalObservedDays = chartData.reduce((sum, row) => sum + row.daysObserved, 0);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Average Revenue by Weekday</h3>
        <p className="text-sm text-gray-600 mt-1">
          True average from {totalObservedDays} observed school day{totalObservedDays === 1 ? '' : 's'} in the selected range.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, entry: any) => {
              if (name === 'Average Revenue') {
                return [formatCurrency(value), 'Average Revenue'];
              }
              if (name === 'Total Revenue') {
                return [formatCurrency(value), 'Total Revenue'];
              }
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload;
              return `${label} • ${point?.txCount ?? 0} transactions • ${point?.daysObserved ?? 0} days`;
            }}
          />
          <Bar dataKey="avgRevenue" name="Average Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
