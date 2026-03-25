import { useState } from 'react';
import { DateRangeSelector } from './DateRangeSelector';
import { KPICards } from './KPICards';
import { RevenueChart } from './RevenueChart';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import { RevenueByProductTable } from './RevenueByProductTable';
import { ExpensesTable } from './ExpensesTable';
import { TransactionsTable } from './TransactionsTable';
import type { Transaction, Expense, Product, Student, StockAdjustment } from '../../App';

interface BudgetPageProps {
  transactions: Transaction[];
  expenses: Expense[];
  products: Product[];
  stockHistory: StockAdjustment[];
  students?: Student[];
  teachers?: any[];
  onAddExpense: (expense: Expense) => void;
}

export type DateRange = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'allTime' | 'custom';

export function BudgetPage({ transactions, expenses, products, stockHistory, students = [], teachers = [], onAddExpense }: BudgetPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const normalizeRangeToDayBounds = (startDate: Date, endDate: Date = startDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return normalizeRangeToDayBounds(today);
      case 'yesterday': {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return normalizeRangeToDayBounds(yesterday);
      }
      case 'last7days': {
        const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return normalizeRangeToDayBounds(week, today);
      }
      case 'thisMonth':
        return normalizeRangeToDayBounds(new Date(now.getFullYear(), now.getMonth(), 1), today);
      case 'lastMonth':
        return normalizeRangeToDayBounds(
          new Date(now.getFullYear(), now.getMonth() - 1, 1),
          new Date(now.getFullYear(), now.getMonth(), 0)
        );
      case 'allTime': {
        const oldestTransaction = transactions.reduce<Date | null>((oldest, transaction) => {
          if (!oldest || transaction.timestamp < oldest) {
            return transaction.timestamp;
          }
          return oldest;
        }, null);

        const oldestExpense = expenses.reduce<Date | null>((oldest, expense) => {
          if (!oldest || expense.date < oldest) {
            return expense.date;
          }
          return oldest;
        }, null);

        const candidates = [oldestTransaction, oldestExpense].filter((date): date is Date => Boolean(date));
        const oldestRecordDate = candidates.length > 0
          ? new Date(Math.min(...candidates.map(date => date.getTime())))
          : today;

        return normalizeRangeToDayBounds(oldestRecordDate, today);
      }
      case 'custom': {
        const customStartDate = customStart || today;
        const customEndDate = customEnd || customStartDate;

        return normalizeRangeToDayBounds(customStartDate, customEndDate);
      }
      default:
        return normalizeRangeToDayBounds(today);
    }
  };

  const range = getDateRangeFilter();

  const filteredTransactions = transactions.filter(
    t => t.timestamp >= range.start && t.timestamp <= range.end
  );

  const filteredExpenses = expenses.filter(
    e => e.date >= range.start && e.date <= range.end
  );

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Date Range Selector */}
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />

        {/* KPI Cards */}
        <KPICards
          transactions={filteredTransactions}
          expenses={filteredExpenses}
        />

        {/* Revenue vs Expense Chart */}
        <RevenueChart
          transactions={filteredTransactions}
          expenses={filteredExpenses}
          dateRange={range}
        />

        <WeekdayRevenueBarChart
          transactions={transactions}
          chosenMonthDate={range.end}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue By Product */}
          <RevenueByProductTable
            transactions={filteredTransactions}
            allTransactions={transactions}
            products={products}
            stockAdjustments={stockHistory}
          />

          {/* Expenses */}
          <ExpensesTable
            expenses={filteredExpenses}
            products={products}
            onAddExpense={onAddExpense}
          />
        </div>

        {/* Transactions Table */}
        <TransactionsTable
          transactions={filteredTransactions}
          students={students}
          teachers={teachers}
        />
      </div>
    </div>
  );
}
