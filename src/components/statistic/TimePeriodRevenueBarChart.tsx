import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Transaction } from '../../App';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import { getTimePeriodRevenueData } from './timePeriodAnalytics';

interface TimePeriodRevenueBarChartProps {
  transactions: Transaction[];
  selectedPeriodId: string | null;
  onSelectPeriod: (periodId: string) => void;
}

export function TimePeriodRevenueBarChart({
  transactions,
  selectedPeriodId,
  onSelectPeriod,
}: TimePeriodRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const data = useMemo(
    () => getTimePeriodRevenueData(transactions).map((entry) => ({
      ...entry,
      avgRevenue: entry.transactionCount > 0 ? entry.totalRevenue / entry.transactionCount : 0,
    })),
    [transactions],
  );

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Average Revenue by Time Period</h3>
        <p className="text-sm text-gray-600 mt-1">
          Bar values are average revenue per transaction for each period.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="periodLabel" stroke="#6b7280" style={{ fontSize: '12px' }} />
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
          <Bar
            dataKey="avgRevenue"
            name="Average Revenue"
            radius={[6, 6, 0, 0]}
            onClick={(entry) => {
              if (entry?.periodId) {
                onSelectPeriod(entry.periodId);
              }
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.periodId}
                fill={selectedPeriodId === entry.periodId ? '#1d4ed8' : '#3b82f6'}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
