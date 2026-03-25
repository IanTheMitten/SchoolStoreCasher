import { useMemo, useState } from 'react';
import type { Transaction } from '../../App';
import { Card } from '../ui/card';
import { WeekdayRevenueBarChart } from '../budget/WeekdayRevenueBarChart';

interface StatisticPageProps {
  transactions: Transaction[];
}

function formatMonthInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonthInputValue(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function StatisticPage({ transactions }: StatisticPageProps) {
  const [chosenMonth, setChosenMonth] = useState(() => formatMonthInputValue(new Date()));

  const chosenMonthDate = useMemo(() => parseMonthInputValue(chosenMonth), [chosenMonth]);

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-gray-900">Statistic</h2>
            <p className="text-sm text-gray-600 mt-1">Weekday average revenue analytics sampled from transaction days.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="statistic-month" className="text-sm text-gray-600">Chosen month</label>
            <input
              id="statistic-month"
              type="month"
              value={chosenMonth}
              onChange={(event) => setChosenMonth(event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
            />
          </div>
        </Card>

        <WeekdayRevenueBarChart
          transactions={transactions}
          chosenMonthDate={chosenMonthDate}
        />
      </div>
    </div>
  );
}
