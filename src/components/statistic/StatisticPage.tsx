import './statistic.css';
import { useMemo, useState } from 'react';
import type { Expense, Product, Student, Transaction } from '../../App';
import { Card } from '../ui/card';
import { SegmentedToggle } from './shared';
import { DateRangeSelector, createStatisticRangeSelection, type StatisticRangeSelection } from './DateRangeSelector';
import { filterByDateRange } from './aggregation';
import { SummaryStrip } from './SummaryStrip';
import { ProfitSection } from './ProfitSection';
import { MenuSection } from './MenuSection';
import { CustomerSection } from './CustomerSection';
import { BusyTimesSection } from './BusyTimesSection';
import { buildCostMap, previousBounds, rangeDays, summarize } from './profitAnalytics';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
  students: Student[];
  expenses?: Expense[];
}

const EMPTY_EXPENSES: Expense[] = [];

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function StatisticPage({ transactions, products, students, expenses = EMPTY_EXPENSES }: StatisticPageProps) {
  const [rangeSelection, setRangeSelection] = useState<StatisticRangeSelection>(() =>
    createStatisticRangeSelection('last30'),
  );
  const [tab, setTab] = useState<'profit' | 'menu' | 'customers' | 'busy'>('profit');
  const { bounds } = rangeSelection;
  const { start, end } = bounds;

  const costMap = useMemo(() => buildCostMap(products), [products]);

  const filtered = useMemo(() => filterByDateRange(transactions, start, end), [transactions, start, end]);
  const summary = useMemo(() => summarize(filtered, costMap), [filtered, costMap]);

  const prev = useMemo(() => previousBounds(bounds), [bounds]);
  const prevSummary = useMemo(
    () => (prev ? summarize(filterByDateRange(transactions, prev.start, prev.end), costMap) : null),
    [prev, transactions, costMap],
  );
  const prevLabel = prev
    ? `the previous ${prev.days} day${prev.days === 1 ? '' : 's'} (${formatShort(prev.start)} to ${formatShort(prev.end)})`
    : null;

  const dayCount = useMemo(() => rangeDays(bounds, filtered), [bounds, filtered]);
  const hasRange = !!(start && end);

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-5 gap-3">
          <div>
            <h2 className="text-gray-900">Statistics</h2>
            <p className="text-sm text-gray-600 mt-1">
              How the store is doing, what to sell, and who buys.
              {hasRange && start && end && ` Showing ${formatShort(start)} to ${formatShort(end)}.`}
              {!hasRange && ' Showing everything on record.'}
            </p>
          </div>
          <DateRangeSelector value={rangeSelection} onChange={setRangeSelection} />
        </Card>

        {!rangeSelection.isValid && (
          <p className="text-sm text-amber-700">Choose a valid start and end date to filter. Showing all sales meanwhile.</p>
        )}

        <SummaryStrip current={summary} previous={prevSummary} previousLabel={prevLabel} />

        <div className="overflow-auto">
          <SegmentedToggle
            label="Section"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'profit', label: 'Sales and profit' },
              { value: 'menu', label: 'What to sell and restock' },
              { value: 'customers', label: 'Customers' },
              { value: 'busy', label: 'Busy times and combos' },
            ]}
          />
        </div>
        {tab === 'profit' && (
          <ProfitSection
            transactions={filtered}
            products={products}
            expenses={expenses}
            bounds={bounds}
            rangeDayCount={dayCount}
            summary={summary}
          />
        )}
        {tab === 'menu' && (
          <MenuSection
            rangeTransactions={filtered}
            allTransactions={transactions}
            products={products}
            rangeDayCount={dayCount}
            hasRange={hasRange}
          />
        )}
        {tab === 'customers' && (
          <CustomerSection
            rangeTransactions={filtered}
            allTransactions={transactions}
            students={students}
            products={products}
          />
        )}
        {tab === 'busy' && (
          <BusyTimesSection transactions={filtered} />
        )}
      </div>
    </div>
  );
}
