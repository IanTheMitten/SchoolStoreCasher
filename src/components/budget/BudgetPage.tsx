import { useMemo, useState } from 'react';
import { DateRangeSelector } from './DateRangeSelector';
import { KPICards } from './KPICards';
import { RevenueChart } from './RevenueChart';
import { WeekdayRevenueBarChart } from './WeekdayRevenueBarChart';
import { RevenueByProductTable } from './RevenueByProductTable';
import { ExpensesTable } from './ExpensesTable';
import { TransactionsTable } from './TransactionsTable';
import { getAnalyticsSelection, type AnalyticsDateRange } from './analyticsSampling';
import type { Transaction, Expense, Product, Student } from '../../App';

interface BudgetPageProps {
  transactions: Transaction[];
  expenses: Expense[];
  products: Product[];
  students?: Student[];
  teachers?: any[];
  onAddExpense: (expense: Expense) => void;
}

export type DateRange = AnalyticsDateRange;

export function BudgetPage({ transactions, expenses, products, students = [], teachers = [], onAddExpense }: BudgetPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [chosenMonth, setChosenMonth] = useState<Date | null>(new Date());
  const [randomSeed, setRandomSeed] = useState<string>('');

  const analyticsSelection = useMemo(
    () =>
      getAnalyticsSelection({
        transactions,
        expenses,
        dateRange,
        customStart,
        customEnd,
        chosenMonth,
        randomSeed,
      }),
    [transactions, expenses, dateRange, customStart, customEnd, chosenMonth, randomSeed]
  );

  const { filteredTransactions, filteredExpenses, range, selectedDayKeys } = analyticsSelection;

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          chosenMonth={chosenMonth}
          onChosenMonthChange={setChosenMonth}
          randomSeed={randomSeed}
          onRandomSeedChange={setRandomSeed}
        />

        <KPICards transactions={filteredTransactions} expenses={filteredExpenses} />

        <RevenueChart transactions={filteredTransactions} expenses={filteredExpenses} dateRange={range} />

        <WeekdayRevenueBarChart transactions={filteredTransactions} sampledDaysCount={selectedDayKeys.size} />

        <div className="grid lg:grid-cols-2 gap-6">
          <RevenueByProductTable transactions={filteredTransactions} products={products} />

          <ExpensesTable expenses={filteredExpenses} products={products} onAddExpense={onAddExpense} />
        </div>

        <TransactionsTable transactions={filteredTransactions} students={students} teachers={teachers} />
      </div>
    </div>
  );
}
