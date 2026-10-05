import { useMemo } from 'react';
import type { Transaction } from '../../App';
import { buildHeatmap, frequentPairs } from './timingAnalytics';
import { EmptyState, SectionCard } from './shared';

export function BusyTimesSection({ transactions }: { transactions: Transaction[] }) {
  const heat = useMemo(() => buildHeatmap(transactions), [transactions]);
  const pairs = useMemo(() => frequentPairs(transactions, 8, 2), [transactions]);

  if (transactions.length === 0) {
    return (
      <SectionCard title="Busy times">
        <EmptyState>No sales in this range.</EmptyState>
      </SectionCard>
    );
  }

  const cellFor = (wd: number, pid: string) => heat.cells.find((c) => c.weekdayIndex === wd && c.periodId === pid)!;

  return (
    <div className="space-y-6">
      <SectionCard
        title="When the counter is busiest"
        subtitle="Average number of sales per open day in each break, by weekday. Darker means busier, so that is when to have extra hands and stock ready."
      >
        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left p-1 text-gray-600 font-normal">Break</th>
                {heat.weekdays.map((w) => (
                  <th key={w.index} className="p-1 text-gray-600 font-normal text-center">
                    {w.label}
                    <div className="text-[10px] text-gray-400">{w.daysObserved} day{w.daysObserved === 1 ? '' : 's'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heat.periods.map((p) => (
                <tr key={p.id}>
                  <td className="p-1 text-gray-700 whitespace-nowrap">{p.label}</td>
                  {heat.weekdays.map((w) => {
                    const c = cellFor(w.index, p.id);
                    const intensity = heat.max > 0 ? c.avgPerDay / heat.max : 0;
                    return (
                      <td
                        key={w.index}
                        className="rounded text-center h-9 min-w-[48px]"
                        style={{
                          backgroundColor: `rgba(37, 99, 235, ${c.avgPerDay > 0 ? 0.08 + intensity * 0.82 : 0})`,
                          color: intensity > 0.55 ? '#fff' : '#111827',
                          border: c.avgPerDay > 0 ? undefined : '1px solid #f3f4f6',
                        }}
                        title={`${w.label} ${p.label}: ${c.transactions} sales in total, ${c.avgPerDay.toFixed(1)} per day`}
                      >
                        {c.avgPerDay > 0 ? c.avgPerDay.toFixed(1) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(heat.outsideBreaks > 0 || heat.weekendTransactions > 0) && (
          <p className="text-xs text-gray-500">
            Not shown: {heat.outsideBreaks} weekday sale{heat.outsideBreaks === 1 ? '' : 's'} outside the listed break times
            {heat.weekendTransactions > 0 ? ` and ${heat.weekendTransactions} on weekends` : ''}.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Often bought together"
        subtitle="Pairs of products that show up in the same purchase. Good for combo deals or placing items side by side."
      >
        {pairs.length === 0 ? (
          <EmptyState>No pairs bought together at least twice in this range.</EmptyState>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-gray-600 font-normal">Products</th>
                  <th className="text-right p-2 text-gray-600 font-normal">Times together</th>
                  <th className="text-left p-2 text-gray-600 font-normal">In plain words</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pairs.map((p) => {
                  const [from, to, pct] = p.pctOfA >= p.pctOfB ? [p.a, p.b, p.pctOfA] : [p.b, p.a, p.pctOfB];
                  return (
                    <tr key={`${p.a.id}-${p.b.id}`} className="hover:bg-gray-50">
                      <td className="p-2 text-gray-900">{p.a.name} + {p.b.name}</td>
                      <td className="p-2 text-right text-gray-900">{p.together}</td>
                      <td className="p-2 text-gray-600">{Math.round(pct)}% of purchases with {from.name} also include {to.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
