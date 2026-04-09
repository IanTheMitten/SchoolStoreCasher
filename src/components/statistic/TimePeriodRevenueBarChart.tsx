import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Transaction } from '../../App';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import { revenueByTimePeriod } from './aggregation';

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

  const data = useMemo(() => revenueByTimePeriod(transactions), [transactions]);
  const topPeriod = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    return data.reduce((best, row) => (row.revenue > best.revenue ? row : best), data[0]);
  }, [data]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Revenue by Time Period</h3>
        <p className="text-sm text-gray-600 mt-1">
          Actual totals from selected dates. Top period: {topPeriod?.label ?? '—'} ({formatCurrency(topPeriod?.revenue ?? 0)}).
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
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
            formatter={(value: number, name: string) => {
              if (name === 'Revenue') {
                return [formatCurrency(value), 'Revenue'];
              }
              return [value, name];
            }}
            labelFormatter={(label, payload) => `${label} • ${payload?.[0]?.payload?.txCount ?? 0} transactions`}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            radius={[6, 6, 0, 0]}
            onClick={(entry) => {
              if (entry?.id) {
                onSelectPeriod(entry.id);
              }
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={selectedPeriodId === entry.id ? '#1d4ed8' : '#3b82f6'}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
