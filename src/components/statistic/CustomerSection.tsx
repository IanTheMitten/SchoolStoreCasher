import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Product, Student, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { customerInsights } from './customerAnalytics';
import { COLORS, EmptyState, SectionCard, SegmentedToggle, formatPct, tooltipStyle } from './shared';

interface Props {
  rangeTransactions: Transaction[];
  allTransactions: Transaction[];
  students: Student[];
  products: Product[];
}

type Who = 'student' | 'teacher';

export function CustomerSection({ rangeTransactions, allTransactions, students, products }: Props) {
  const { formatCurrency } = useCurrency();
  const [who, setWho] = useState<Who>('student');
  const insights = useMemo(
    () => customerInsights(rangeTransactions, allTransactions, students, products),
    [rangeTransactions, allTransactions, students, products],
  );

  if (rangeTransactions.length === 0) {
    return (
      <SectionCard title="Customers">
        <EmptyState>No sales in this range.</EmptyState>
      </SectionCard>
    );
  }

  const { named, anonymous, newVsReturning: nr } = insights;
  const totalRevenue = named.revenue + anonymous.revenue;
  const namedShare = totalRevenue > 0 ? (named.revenue / totalRevenue) * 100 : null;
  const totalTx = named.transactions + anonymous.transactions;
  const namedTxShare = totalTx > 0 ? (named.transactions / totalTx) * 100 : null;
  const list = insights.top.filter((c) => c.kind === who).slice(0, 10);
  const gradeData = insights.byGrade.filter((g) => g.revenue > 0 || g.enrolled > 0);
  const buyers = nr.newBuyers + nr.returningBuyers;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Who is buying" subtitle="Sales linked to a student or teacher versus anonymous cash sales.">
          <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden flex" aria-hidden>
            <div className="bg-blue-500 h-full" style={{ width: `${namedShare ?? 0}%` }} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-600">Named customers</dt>
              <dd className="text-gray-900">{formatCurrency(named.revenue)} ({formatPct(namedShare)} of revenue)</dd>
              <dd className="text-xs text-gray-500">{named.transactions} sales ({formatPct(namedTxShare)})</dd>
            </div>
            <div>
              <dt className="text-gray-600">Anonymous cash</dt>
              <dd className="text-gray-900">{formatCurrency(anonymous.revenue)}</dd>
              <dd className="text-xs text-gray-500">{anonymous.transactions} sales</dd>
            </div>
          </dl>
          {namedShare !== null && namedShare < 50 && (
            <p className="text-xs text-gray-500">Most sales are anonymous, so the customer tables below only cover part of your sales.</p>
          )}
        </SectionCard>

        <SectionCard
          title="New and returning buyers"
          subtitle="New means the first purchase we have on record happened in this range."
        >
          {buyers === 0 ? (
            <EmptyState>No named buyers in this range.</EmptyState>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-600">New buyers</dt>
                  <dd className="text-gray-900">{nr.newBuyers} ({formatCurrency(nr.newRevenue)})</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Returning buyers</dt>
                  <dd className="text-gray-900">{nr.returningBuyers} ({formatCurrency(nr.returningRevenue)})</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-600">Bought more than once in this range</dt>
                  <dd className="text-gray-900">{formatPct(nr.repeatRatePct)} of buyers</dd>
                </div>
              </dl>
              {nr.coversAllHistory && (
                <p className="text-xs text-gray-500">This range reaches back to your first sale, so everyone counts as new. Pick a shorter range to see returning buyers.</p>
              )}
            </>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Top spenders"
        subtitle="Top 10 by total spend in this range."
        action={
          <SegmentedToggle
            label="Customer type"
            value={who}
            onChange={setWho}
            options={[
              { value: 'student', label: 'Students' },
              { value: 'teacher', label: 'Teachers' },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <EmptyState>No {who} purchases in this range.</EmptyState>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-gray-600 font-normal">#</th>
                  <th className="text-left p-2 text-gray-600 font-normal">Name</th>
                  {who === 'student' && <th className="text-left p-2 text-gray-600 font-normal">Grade</th>}
                  <th className="text-right p-2 text-gray-600 font-normal">Spent</th>
                  <th className="text-right p-2 text-gray-600 font-normal">Visits</th>
                  <th className="text-right p-2 text-gray-600 font-normal">Per visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((c, i) => (
                  <tr key={c.key} className="hover:bg-gray-50">
                    <td className="p-2 text-gray-500">{i + 1}</td>
                    <td className="p-2 text-gray-900">{c.name}</td>
                    {who === 'student' && <td className="p-2 text-gray-900">{c.grade || '—'}</td>}
                    <td className="p-2 text-right text-gray-900">{formatCurrency(c.revenue)}</td>
                    <td className="p-2 text-right text-gray-900">{c.visits}</td>
                    <td className="p-2 text-right text-gray-900">{formatCurrency(c.avgPerVisit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Spending by grade" subtitle="Student spending, and how many students in each grade bought something.">
        {gradeData.length === 0 ? (
          <EmptyState>No students recorded yet.</EmptyState>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ResponsiveContainer width="100%" height={Math.max(200, gradeData.length * 36)}>
              <BarChart data={gradeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="grade" stroke="#6b7280" style={{ fontSize: 12 }} width={72} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Spent']} />
                <Bar dataKey="revenue" name="Spent" fill={COLORS.revenue} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 text-gray-600 font-normal">Grade</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Spent</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Buyers</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Students</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Bought</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gradeData.map((g) => (
                    <tr key={g.grade}>
                      <td className="p-2 text-gray-900">{g.grade}</td>
                      <td className="p-2 text-right text-gray-900">{formatCurrency(g.revenue)}</td>
                      <td className="p-2 text-right text-gray-900">{g.buyers}</td>
                      <td className="p-2 text-right text-gray-900">{g.enrolled}</td>
                      <td className="p-2 text-right text-gray-900">{formatPct(g.participationPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
