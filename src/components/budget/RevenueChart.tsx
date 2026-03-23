import { useMemo } from 'react';
import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction, Expense } from '../../App';

interface RevenueChartProps {
  transactions: Transaction[];
  expenses: Expense[];
  dateRange: { start: Date; end: Date };
}

export function RevenueChart({ transactions, expenses, dateRange }: RevenueChartProps) {
  const { formatCurrency } = useCurrency();
  const chartData = useMemo(() => {
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const getDayKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const getDateLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Group by day
    const dataMap = new Map<string, { dateLabel: string; revenue: number; expenses: number }>();
    
    // Initialize all days
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayKey = getDayKey(date);
      dataMap.set(dayKey, { dateLabel: getDateLabel(date), revenue: 0, expenses: 0 });
    }
    
    // Add transactions
    transactions.forEach(t => {
      const dayKey = getDayKey(t.timestamp);
      const existing = dataMap.get(dayKey) || { dateLabel: getDateLabel(t.timestamp), revenue: 0, expenses: 0 };
      dataMap.set(dayKey, { ...existing, revenue: existing.revenue + t.total });
    });
    
    // Add expenses
    expenses.forEach(e => {
      const dayKey = getDayKey(e.date);
      const existing = dataMap.get(dayKey) || { dateLabel: getDateLabel(e.date), revenue: 0, expenses: 0 };
      dataMap.set(dayKey, { ...existing, expenses: existing.expenses + e.amount });
    });
    
    return Array.from(dataMap.entries())
      .map(([dayKey, data]) => ({
        dayKey,
        dateLabel: data.dateLabel,
        revenue: data.revenue,
        expenses: data.expenses
      }))
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  }, [transactions, expenses, dateRange]);

  return (
    <Card className="p-6">
      <h3 className="text-gray-900 mb-4">Revenue vs Expenses</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="dateLabel" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
          <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} name="Expenses" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
