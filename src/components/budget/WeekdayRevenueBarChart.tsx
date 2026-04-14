import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';
// Keep weekday aggregation deterministic and shared with statistic analytics.
import { aggregateWeekdayRevenueFromTransactions, type WeekdayRevenueFromTransactions } from '../analytics/sharedAggregation';

interface WeekdayRevenueBarChartProps {
  transactions: Transaction[];
}

export function WeekdayRevenueBarChart({ transactions }: WeekdayRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const chartData = useMemo<WeekdayRevenueFromTransactions[]>(
    () => aggregateWeekdayRevenueFromTransactions(transactions),
    [transactions],
  );

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

              const datum = payload[0].payload as WeekdayRevenueFromTransactions;

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
