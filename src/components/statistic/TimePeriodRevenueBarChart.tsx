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
  const highestRevenuePeriodId = useMemo(
    () => data.reduce((highest, current) => (current.totalRevenue > highest.totalRevenue ? current : highest), data[0]).periodId,
    [data],
  );
  const highestTransactionPeriodId = useMemo(
    () =>
      data.reduce(
        (highest, current) => (current.transactionCount > highest.transactionCount ? current : highest),
        data[0],
      ).periodId,
    [data],
  );
  const highestRevenuePeriod = data.find((entry) => entry.periodId === highestRevenuePeriodId);
  const highestTransactionPeriod = data.find((entry) => entry.periodId === highestTransactionPeriodId);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Revenue by Time Period</h3>
        <p className="text-sm text-gray-600 mt-1">
          Highest revenue: {highestRevenuePeriod?.periodLabel ?? '—'} ({formatCurrency(highestRevenuePeriod?.totalRevenue ?? 0)})
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Most transactions: {highestTransactionPeriod?.periodLabel ?? '—'} ({highestTransactionPeriod?.transactionCount ?? 0} tx)
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
            formatter={(value: number, _name: string, item) => {
              if (item?.dataKey === 'totalRevenue') {
                return [formatCurrency(value), 'Revenue'];
              }

              return [value, 'Transactions'];
            }}
            labelFormatter={(label, payload) => {
              const transactionCount = payload?.[0]?.payload?.transactionCount ?? 0;
              return `${label} • ${transactionCount} tx`;
            }}
          />
          <Bar
            dataKey="totalRevenue"
            name="Revenue"
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
                fill={
                  selectedPeriodId === entry.periodId
                    ? '#1d4ed8'
                    : entry.periodId === highestRevenuePeriodId
                      ? '#2563eb'
                      : entry.periodId === highestTransactionPeriodId
                        ? '#60a5fa'
                        : '#93c5fd'
                }
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
