import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { Product, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Button } from '../ui/button';
import {
  GOOD_MARGIN_PCT,
  MENU_CLASS_LABELS,
  buildRestockList,
  classifyProducts,
  restockToCsv,
  type MenuClass,
  type RestockRow,
} from './menuAnalytics';
import { EmptyState, SectionCard, SegmentedToggle, formatPct } from './shared';

interface Props {
  rangeTransactions: Transaction[];
  allTransactions: Transaction[];
  products: Product[];
  rangeDayCount: number;
  hasRange: boolean;
}

const CLASS_STYLE: Record<MenuClass, string> = {
  star: 'bg-green-100 text-green-800',
  thin: 'bg-amber-100 text-amber-800',
  gem: 'bg-blue-100 text-blue-800',
  slow: 'bg-orange-100 text-orange-800',
  unsold: 'bg-red-100 text-red-800',
  idle: 'bg-gray-100 text-gray-700',
};

const CLASS_HELP: Record<Exclude<MenuClass, 'idle'>, string> = {
  star: 'Sell a lot and earn well',
  thin: 'Sell a lot, earn little per item',
  gem: 'Sell slowly, earn well',
  slow: 'Sell slowly, earn little',
  unsold: 'No sales but stock on the shelf',
};

type Filter = 'all' | 'keep' | 'review';

export function MenuSection({ rangeTransactions, allTransactions, products, rangeDayCount, hasRange }: Props) {
  const { formatCurrency } = useCurrency();
  const [filter, setFilter] = useState<Filter>('all');
  const [runOutWithin, setRunOutWithin] = useState(5);
  const [coverDays, setCoverDays] = useState(10);

  const rows = useMemo(
    () => classifyProducts(products, rangeTransactions, allTransactions),
    [products, rangeTransactions, allTransactions],
  );
  const visible = rows.filter((r) => {
    if (r.menuClass === 'idle') return false;
    if (filter === 'keep') return r.menuClass === 'star' || r.menuClass === 'gem';
    if (filter === 'review') return r.menuClass === 'thin' || r.menuClass === 'slow' || r.menuClass === 'unsold';
    return true;
  });
  const order: Record<MenuClass, number> = { star: 0, gem: 1, thin: 2, slow: 3, unsold: 4, idle: 5 };
  visible.sort((a, b) => order[a.menuClass] - order[b.menuClass] || b.profit - a.profit || a.name.localeCompare(b.name));

  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.menuClass]: (acc[r.menuClass] ?? 0) + 1 }), {});
  const dropCash = rows.filter((r) => r.menuClass === 'unsold' || r.menuClass === 'slow').reduce((s, r) => s + r.cashTiedUp, 0);

  const restock = useMemo(
    () => buildRestockList(products, allTransactions, { runOutWithinDays: runOutWithin, coverDays }),
    [products, allTransactions, runOutWithin, coverDays],
  );
  const restockTotal = restock.reduce((s, r) => s + r.estimatedCost, 0);

  const exportCsv = () => {
    const blob = new Blob([restockToCsv(restock)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restock-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="What to sell"
        subtitle={`Each product is judged on the selected range${hasRange ? '' : ' (all time)'}: ${rangeDayCount} day${rangeDayCount === 1 ? '' : 's'}. Good margin means at least ${GOOD_MARGIN_PCT}% profit on the price; "sells a lot" means at or above the typical product.`}
        action={
          <SegmentedToggle
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'keep', label: 'Keep' },
              { value: 'review', label: 'Review' },
            ]}
          />
        }
      >
        {products.length === 0 ? (
          <EmptyState>No products yet. Add products in Inventory.</EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              {(Object.keys(CLASS_HELP) as (keyof typeof CLASS_HELP)[]).map((c) => (
                <span key={c} className={`rounded-full px-2.5 py-1 ${CLASS_STYLE[c]}`}>
                  {MENU_CLASS_LABELS[c]}: {counts[c] ?? 0} <span className="opacity-75">({CLASS_HELP[c]})</span>
                </span>
              ))}
            </div>
            {dropCash > 0 && (
              <p className="text-sm text-gray-700">
                {formatCurrency(dropCash)} is tied up in stock of slow and unsold products.
              </p>
            )}
            {visible.length === 0 ? (
              <EmptyState>No products to show here.</EmptyState>
            ) : (
              <div className="overflow-auto max-h-[520px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-gray-600 font-normal">Product</th>
                      <th className="text-left p-2 text-gray-600 font-normal">Verdict</th>
                      <th className="text-left p-2 text-gray-600 font-normal hidden lg:table-cell">Why</th>
                      <th className="text-right p-2 text-gray-600 font-normal">Sold</th>
                      <th className="text-right p-2 text-gray-600 font-normal">Profit</th>
                      <th className="text-right p-2 text-gray-600 font-normal">Margin</th>
                      <th className="text-right p-2 text-gray-600 font-normal">In stock</th>
                      <th className="text-right p-2 text-gray-600 font-normal">Cash tied up</th>
                      <th className="text-right p-2 text-gray-600 font-normal">Last sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((r) => (
                      <tr key={r.productId} className="hover:bg-gray-50 align-top">
                        <td className="p-2 text-gray-900 min-w-[180px]">
                          {r.name}
                          <div className="text-xs text-gray-500 lg:hidden">{r.reason}</div>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${CLASS_STYLE[r.menuClass]}`}>{MENU_CLASS_LABELS[r.menuClass]}</span>
                        </td>
                        <td className="p-2 text-gray-600 hidden lg:table-cell max-w-[360px]">{r.reason}</td>
                        <td className="p-2 text-right text-gray-900">{r.units.toLocaleString()}</td>
                        <td className="p-2 text-right text-gray-900">{formatCurrency(r.profit)}</td>
                        <td className="p-2 text-right text-gray-900">{formatPct(r.marginPct)}</td>
                        <td className="p-2 text-right text-gray-900">{r.stock}</td>
                        <td className="p-2 text-right text-gray-900">{formatCurrency(r.cashTiedUp)}</td>
                        <td className="p-2 text-right text-gray-900 whitespace-nowrap">
                          {r.daysSinceLastSale === null ? 'Never' : r.daysSinceLastSale === 0 ? 'Today' : `${r.daysSinceLastSale}d ago`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Restock list"
        subtitle="Products at or below their reorder level, or likely to run out soon at the recent selling pace (last 4 weeks, per day the store was open). Always uses today, not the selected range."
        action={
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={restock.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      >
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            Warn if it runs out within
            <input
              type="number"
              min={1}
              max={60}
              value={runOutWithin}
              onChange={(e) => setRunOutWithin(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              className="w-16 rounded-md border px-2 py-1"
            />
            selling days
          </label>
          <label className="flex items-center gap-2">
            Order enough for
            <input
              type="number"
              min={1}
              max={90}
              value={coverDays}
              onChange={(e) => setCoverDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
              className="w-16 rounded-md border px-2 py-1"
            />
            selling days
          </label>
        </div>
        {restock.length === 0 ? (
          <EmptyState>Nothing needs restocking right now.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-gray-700">
              {restock.length} product{restock.length === 1 ? '' : 's'} to order, about {formatCurrency(restockTotal)} in total.
            </p>
            <div className="overflow-auto max-h-[520px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-gray-600 font-normal">Product</th>
                    <th className="text-left p-2 text-gray-600 font-normal">Why</th>
                    <th className="text-right p-2 text-gray-600 font-normal">In stock</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Sells per day</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Order</th>
                    <th className="text-right p-2 text-gray-600 font-normal">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {restock.map((r) => (
                    <tr key={r.productId} className="hover:bg-gray-50">
                      <td className="p-2 text-gray-900">{r.name}</td>
                      <td className="p-2">
                        <span className={r.reason === 'out' ? 'text-red-700' : r.reason === 'below' ? 'text-amber-700' : 'text-gray-700'}>{r.reasonText}</span>
                      </td>
                      <td className="p-2 text-right text-gray-900">{r.stock}</td>
                      <td className="p-2 text-right text-gray-900">{r.unitsPerSellingDay > 0 ? r.unitsPerSellingDay.toFixed(1) : '—'}</td>
                      <td className="p-2 text-right text-gray-900">{r.suggestedQty}</td>
                      <td className="p-2 text-right text-gray-900">{formatCurrency(r.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

export type { RestockRow };
