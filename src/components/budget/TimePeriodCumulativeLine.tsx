import { useMemo } from 'react';
import { Card } from '../ui/card';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';
import {
  CANONICAL_PERIODS,
  getCanonicalPeriodForDate,
  type CanonicalPeriodId,
} from './TimePeriodRevenueBarChart';

interface TimePeriodCumulativeLineProps {
  transactions: Transaction[];
  selectedPeriod: CanonicalPeriodId | null;
}

export function TimePeriodCumulativeLine({ transactions, selectedPeriod }: TimePeriodCumulativeLineProps) {
  const { formatCurrency } = useCurrency();

  const selectedPeriodLabel = CANONICAL_PERIODS.find(period => period.id === selectedPeriod)?.label ?? 'Select a period';

  const chartData = useMemo(() => {
    if (!selectedPeriod) {
      return [];
    }

    const sampledTransactions = transactions
      .filter(tx => {
        const isWeekend = tx.timestamp.getDay() === 0 || tx.timestamp.getDay() === 6;
        return !isWeekend && getCanonicalPeriodForDate(tx.timestamp) === selectedPeriod;
      })
      .slice()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let running = 0;
    const points = sampledTransactions.map((tx, index) => {
      running += tx.total;
      return {
        step: index + 1,
        timestampLabel: tx.timestamp.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        cumulativeRevenue: running,
      };
    });

    return [
      {
        step: 0,
        timestampLabel: 'Start',
        cumulativeRevenue: 0,
      },
      ...points,
    ];
  }, [transactions, selectedPeriod]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Cumulative Revenue ({selectedPeriodLabel})</h3>
        <div className="text-sm text-gray-500">Running total starts at 0 and follows sampled sales in time order</div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="step" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.timestampLabel ?? ''}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Line type="monotone" dataKey="cumulativeRevenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
