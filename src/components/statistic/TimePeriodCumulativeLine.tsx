import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../../App';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import { CANONICAL_TIME_PERIODS, getSelectedPeriodCumulativeSeries } from './timePeriodAnalytics';

interface TimePeriodCumulativeLineProps {
  transactions: Transaction[];
  selectedPeriodId: string;
}

export function TimePeriodCumulativeLine({ transactions, selectedPeriodId }: TimePeriodCumulativeLineProps) {
  const { formatCurrency } = useCurrency();

  const points = useMemo(
    () => getSelectedPeriodCumulativeSeries(transactions, selectedPeriodId),
    [transactions, selectedPeriodId],
  );

  const selectedPeriodLabel =
    CANONICAL_TIME_PERIODS.find((period) => period.id === selectedPeriodId)?.label ?? selectedPeriodId;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Cumulative Revenue: {selectedPeriodLabel}</h3>
        <p className="text-sm text-gray-600 mt-1">
          Running total starts at 0 across all transactions in the selected period.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="pointLabel" stroke="#6b7280" style={{ fontSize: '12px' }} interval="preserveStartEnd" />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, _name: string, entry: any) => {
              if (entry?.payload?.transactionTotal) {
                return [`${formatCurrency(value)} ( +${formatCurrency(entry.payload.transactionTotal)} )`, 'Cumulative'];
              }
              return [formatCurrency(value), 'Cumulative'];
            }}
            labelFormatter={(label) => label}
          />
          <Line type="monotone" dataKey="cumulativeRevenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} name="Cumulative Revenue" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
