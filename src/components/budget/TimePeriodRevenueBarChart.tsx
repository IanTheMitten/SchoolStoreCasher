import { useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction } from '../../App';

export interface CanonicalPeriod {
  id: string;
  label: string;
  startMinute: number;
  endMinute: number;
}

export const CANONICAL_PERIODS: CanonicalPeriod[] = [
  { id: '09:00-09:10', label: '9:00–9:10', startMinute: 9 * 60, endMinute: 9 * 60 + 10 },
  { id: '09:55-10:05', label: '9:55–10:05', startMinute: 9 * 60 + 55, endMinute: 10 * 60 + 5 },
  { id: '10:50-11:00', label: '10:50–11:00', startMinute: 10 * 60 + 50, endMinute: 11 * 60 },
  { id: '11:45-12:40', label: '11:45–12:40', startMinute: 11 * 60 + 45, endMinute: 12 * 60 + 40 },
  { id: '13:10-13:20', label: '1:10–1:20', startMinute: 13 * 60 + 10, endMinute: 13 * 60 + 20 },
  { id: '14:05-14:15', label: '2:05–2:15', startMinute: 14 * 60 + 5, endMinute: 14 * 60 + 15 },
  { id: '15:00-15:10', label: '3:00–3:10', startMinute: 15 * 60, endMinute: 15 * 60 + 10 },
  { id: '16:00-24:00', label: '4:00–24:00', startMinute: 16 * 60, endMinute: 24 * 60 }
];

export type CanonicalPeriodId = (typeof CANONICAL_PERIODS)[number]['id'];

export function getCanonicalPeriodForDate(date: Date): CanonicalPeriodId | null {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const match = CANONICAL_PERIODS.find(period => minutes >= period.startMinute && minutes < period.endMinute);
  return match?.id ?? null;
}

function getDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface TimePeriodRevenueBarChartProps {
  transactions: Transaction[];
  selectedPeriod: CanonicalPeriodId | null;
  onSelectPeriod: (periodId: CanonicalPeriodId) => void;
}

export function TimePeriodRevenueBarChart({
  transactions,
  selectedPeriod,
  onSelectPeriod,
}: TimePeriodRevenueBarChartProps) {
  const { formatCurrency } = useCurrency();

  const { chartData, eligibleDayCount } = useMemo(() => {
    const eligibleDayKeys = new Set<string>();
    const periodTotals = new Map<CanonicalPeriodId, number>();

    CANONICAL_PERIODS.forEach(period => {
      periodTotals.set(period.id, 0);
    });

    transactions.forEach(tx => {
      if (tx.timestamp.getDay() === 0 || tx.timestamp.getDay() === 6) {
        return;
      }

      eligibleDayKeys.add(getDayKey(tx.timestamp));
      const periodId = getCanonicalPeriodForDate(tx.timestamp);
      if (!periodId) {
        return;
      }

      periodTotals.set(periodId, (periodTotals.get(periodId) ?? 0) + tx.total);
    });

    const dayCount = eligibleDayKeys.size;

    return {
      eligibleDayCount: dayCount,
      chartData: CANONICAL_PERIODS.map(period => ({
        periodId: period.id,
        label: period.label,
        averageRevenue: dayCount > 0 ? (periodTotals.get(period.id) ?? 0) / dayCount : 0,
        isSelected: selectedPeriod === period.id,
      })),
    };
  }, [transactions, selectedPeriod]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Average Revenue by Time Period</h3>
        <div className="text-sm text-gray-500">
          {eligibleDayCount > 0
            ? `Averages across ${eligibleDayCount} sampled eligible day${eligibleDayCount === 1 ? '' : 's'}`
            : 'No eligible weekdays with transactions in selected date range'}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            angle={-20}
            textAnchor="end"
            interval={0}
            height={70}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Bar
            dataKey="averageRevenue"
            radius={[6, 6, 0, 0]}
            onClick={(payload) => {
              if (payload?.periodId) {
                onSelectPeriod(payload.periodId);
              }
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.periodId}
                fill={entry.isSelected ? '#2563eb' : '#93c5fd'}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
