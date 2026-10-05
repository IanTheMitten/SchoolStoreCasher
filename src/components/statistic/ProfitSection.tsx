import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Expense, Product, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  type BreakdownRow,
  breakdownByCategory,
  breakdownByProduct,
  buildCostMap,
  defaultGranularity,
  seriesByGranularity,
  summarizeExpenses,
  weekdayPattern,
  type Granularity,
  type RangeBounds,
  type Summary,
} from './profitAnalytics';
import { BestDaysTable } from './BestDaysTable';
import { COLORS, EmptyState, SectionCard, SegmentedToggle, formatPct, tooltipStyle } from './shared';

interface Props {
  transactions: Transaction[];
  products: Product[];
  expenses: Expense[];
  bounds: RangeBounds;
  rangeDayCount: number;
  summary: Summary;
}

export function ProfitSection({ transactions, products, expenses, bounds, rangeDayCount, summary }: Props) {
  const { formatCurrency } = useCurrency();
  const [granularity, setGranularity] = useState<Granularity>(() => defaultGranularity(rangeDayCount));
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Re-pick a sensible bucket size whenever the selected range changes size.
  useEffect(() => {
    setGranularity(defaultGranularity(rangeDayCount));
  }, [rangeDayCount]);

  const costMap = useMemo(() => buildCostMap(products), [products]);
  const series = useMemo(() => seriesByGranularity(transactions, granularity, costMap), [transactions, granularity, costMap]);
  const weekdays = useMemo(() => weekdayPattern(transactions, costMap), [transactions, costMap]);
  const categories = useMemo(() => breakdownByCategory(transactions, products), [transactions, products]);
  const productRows = useMemo(() => breakdownByProduct(transactions, products), [transactions, products]);
  const expenseSummary = useMemo(() => summarizeExpenses(expenses, bounds), [expenses, bounds]);

  if (transactions.length === 0) {
    return (
      <SectionCard title="Sales and profit">
        <EmptyState>No sales in this range.</EmptyState>
      </SectionCard>
    );
  }

  const profitAfterOther = summary.profit - expenseSummary.other;
  const cashResult = summary.revenue - expenseSummary.total;
  const visibleProducts = showAllProducts ? productRows : productRows.slice(0, 10);
  const money = (v: number) => formatCurrency(v);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Revenue and profit over time"
        subtitle="Green is what you kept after paying for the items. Blue is everything customers paid."
        action={
          <SegmentedToggle
            label="Group by"
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={series} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" stroke="#6b7280" style={{ fontSize: 12 }} minTickGap={16} />
            <YAxis stroke="#6b7280" style={{ fontSize: 12 }} width={64} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [money(v), name]} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill={COLORS.profit} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="After expenses"
          subtitle="Expenses come from the Budget page and use the same dates. Restock purchases are shown separately because their cost is already inside profit."
        >
          <dl className="text-sm divide-y divide-gray-100">
            <Row label="Profit on items sold" value={money(summary.profit)} />
            <Row label="Other expenses (not restocking)" value={`− ${money(expenseSummary.other)}`} />
            <Row label="Profit after other expenses" value={money(profitAfterOther)} strong tone={profitAfterOther} />
            <div className="pt-3" />
            <Row label="Revenue" value={money(summary.revenue)} />
            <Row label="All expenses incl. restocking" value={`− ${money(expenseSummary.total)}`} />
            <Row label="Cash result in this range" value={money(cashResult)} strong tone={cashResult} />
          </dl>
          <p className="text-xs text-gray-500">
            Cash result can look low in weeks where you bought a lot of stock that has not sold yet.
            {expenseSummary.count === 0 && ' No expenses were recorded in this range.'}
          </p>
        </SectionCard>

        <SectionCard title="Average day of the week" subtitle="Typical revenue and profit on each weekday that had sales.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekdays} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="weekday" stroke="#6b7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" style={{ fontSize: 12 }} width={64} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [money(v), name]}
                labelFormatter={(label, payload) => `${label} (${payload?.[0]?.payload?.daysObserved ?? 0} days)`}
              />
              <Legend />
              <Bar dataKey="avgRevenue" name="Avg revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgProfit" name="Avg profit" fill={COLORS.profit} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Profit by category" subtitle="Which kinds of items earn the money.">
          <BreakdownTable rows={categories} nameHeader="Category" formatCurrency={formatCurrency} />
        </SectionCard>

        <SectionCard
          title="Profit by product"
          subtitle="Ranked by profit, not revenue."
          action={
            productRows.length > 10 ? (
              <button type="button" className="text-sm text-blue-700 hover:underline" onClick={() => setShowAllProducts((s) => !s)}>
                {showAllProducts ? 'Show top 10' : `Show all ${productRows.length}`}
              </button>
            ) : undefined
          }
        >
          <BreakdownTable rows={visibleProducts} nameHeader="Product" formatCurrency={formatCurrency} maxHeight />
        </SectionCard>
      </div>

      <BestDaysTable filteredTransactions={transactions} />
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: number }) {
  const color = tone === undefined ? 'text-gray-900' : tone < 0 ? 'text-red-600' : 'text-green-700';
  return (
    <div className="flex justify-between py-1.5 gap-4">
      <dt className={strong ? 'text-gray-900' : 'text-gray-600'}>{label}</dt>
      <dd className={`${strong ? 'font-medium' : ''} ${color} whitespace-nowrap`}>{value}</dd>
    </div>
  );
}

function BreakdownTable({
  rows,
  nameHeader,
  formatCurrency,
  maxHeight,
}: {
  rows: BreakdownRow[];
  nameHeader: string;
  formatCurrency: (v: number) => string;
  maxHeight?: boolean;
}) {
  if (rows.length === 0) return <EmptyState>No sales in this range.</EmptyState>;
  return (
    <div className={`overflow-auto ${maxHeight ? 'max-h-[420px]' : ''}`}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left p-2 text-gray-600 font-normal">{nameHeader}</th>
            <th className="text-right p-2 text-gray-600 font-normal">Sold</th>
            <th className="text-right p-2 text-gray-600 font-normal">Revenue</th>
            <th className="text-right p-2 text-gray-600 font-normal">Profit</th>
            <th className="text-right p-2 text-gray-600 font-normal">Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-gray-50">
              <td className="p-2 text-gray-900">{r.name}</td>
              <td className="p-2 text-right text-gray-900">{r.units.toLocaleString()}</td>
              <td className="p-2 text-right text-gray-900">{formatCurrency(r.revenue)}</td>
              <td className={`p-2 text-right ${r.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(r.profit)}</td>
              <td className="p-2 text-right text-gray-900" title={r.costKnown ? undefined : 'Some cost data missing'}>
                {formatPct(r.marginPct, 0)}
                {!r.costKnown && '*'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
