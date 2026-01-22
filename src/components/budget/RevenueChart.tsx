import { useMemo } from 'react';
import { Card } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Transaction, Expense } from '../../App';

interface RevenueChartProps {
  transactions: Transaction[];
  expenses: Expense[];
  dateRange: { start: Date; end: Date };
}

export function RevenueChart({ transactions, expenses, dateRange }: RevenueChartProps) {
  const chartData = useMemo(() => {
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Group by day
    const dataMap = new Map<string, { revenue: number; expenses: number }>();
    
    // Initialize all days
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap.set(key, { revenue: 0, expenses: 0 });
    }
    
    // Add transactions
    transactions.forEach(t => {
      const key = t.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = dataMap.get(key) || { revenue: 0, expenses: 0 };
      dataMap.set(key, { ...existing, revenue: existing.revenue + t.total });
    });
    
    // Add expenses
    expenses.forEach(e => {
      const key = e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = dataMap.get(key) || { revenue: 0, expenses: 0 };
      dataMap.set(key, { ...existing, expenses: existing.expenses + e.amount });
    });
    
    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expenses: data.expenses
    }));
  }, [transactions, expenses, dateRange]);

  return (
    <Card className="p-6">
      <h3 className="text-gray-900 mb-4">Revenue vs Expenses</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => {
              try { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(value)); }
              catch (e) { return `₩${Math.round(value)}`; }
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
          <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} name="Expenses" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
