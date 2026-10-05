// Pure "what to sell" and "restock" logic. Thresholds are exported so they are easy to tweak.
import type { Product, Transaction } from '../../App';
import { toDayKey } from '../analytics/sharedAggregation';
import { addDays, buildCostMap, diffCalendarDays, lineEconomics, startOfDay, toDate } from './profitAnalytics';

/** A product earning at least this % of its price counts as "good margin". */
export const GOOD_MARGIN_PCT = 25;
/** Restock rate is measured over this many calendar days before "now". */
export const RESTOCK_LOOKBACK_DAYS = 28;

export type MenuClass = 'star' | 'thin' | 'gem' | 'slow' | 'unsold' | 'idle';

export interface MenuRow {
  productId: string;
  name: string;
  category: string;
  menuClass: MenuClass;
  reason: string;
  units: number;
  revenue: number;
  profit: number;
  marginPct: number | null;
  stock: number;
  cashTiedUp: number; // stock x current unit cost
  daysSinceLastSale: number | null; // null = never sold
}

export const MENU_CLASS_LABELS: Record<MenuClass, string> = {
  star: 'Star',
  thin: 'Busy but thin profit',
  gem: 'Hidden gem',
  slow: 'Slow mover',
  unsold: 'Not selling',
  idle: 'Inactive',
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Rules (sold = at least 1 unit in the selected range):
 *  - high volume = units >= median units among sold products
 *  - good margin = margin >= GOOD_MARGIN_PCT (unknown cost counts as "good" so we do not unfairly penalise)
 *  - high + good  -> Star | high + thin -> Busy but thin profit
 *  - low + good   -> Hidden gem | low + thin -> Slow mover (drop candidate)
 *  - no sales in range but stock > 0 -> Not selling (drop candidate); no sales and no stock -> Inactive
 */
export function classifyProducts(
  products: Product[],
  rangeTx: Transaction[],
  allTx: Transaction[],
  now = new Date(),
): MenuRow[] {
  const costMap = buildCostMap(products);
  const agg = new Map<string, { units: number; revenue: number; cost: number; allKnown: boolean }>();
  for (const tx of rangeTx) {
    for (const item of tx.items ?? []) {
      const l = lineEconomics(item, costMap);
      const a = agg.get(l.productId) ?? { units: 0, revenue: 0, cost: 0, allKnown: true };
      a.units += l.quantity;
      a.revenue += l.revenue;
      a.cost += l.cost;
      if (!l.costKnown) a.allKnown = false;
      agg.set(l.productId, a);
    }
  }
  const lastSale = new Map<string, Date>();
  for (const tx of allTx) {
    const ts = toDate(tx.timestamp);
    if (!ts) continue;
    for (const item of tx.items ?? []) {
      const prev = lastSale.get(item.product?.id);
      if (!prev || ts > prev) lastSale.set(item.product?.id, ts);
    }
  }

  const sold = products.filter((p) => (agg.get(p.id)?.units ?? 0) > 0);
  const medianUnits = median(sold.map((p) => agg.get(p.id)!.units));

  return products.map((p): MenuRow => {
    const a = agg.get(p.id);
    const units = a?.units ?? 0;
    const revenue = a?.revenue ?? 0;
    const profit = a ? a.revenue - a.cost : 0;
    // Unknown cost on any line -> margin is unknown (null) rather than inflated.
    const marginPct = a && a.revenue > 0 && a.allKnown ? (profit / a.revenue) * 100 : null;
    const stock = Math.max(0, Number(p.stock) || 0);
    const cashTiedUp = stock * (Number(p.unitCost) || 0);
    const last = lastSale.get(p.id);
    const daysSinceLastSale = last ? Math.max(0, diffCalendarDays(last, now)) : null;
    const base = {
      productId: p.id,
      name: p.name,
      category: p.category || 'Uncategorized',
      units,
      revenue,
      profit,
      marginPct,
      stock,
      cashTiedUp,
      daysSinceLastSale,
    };

    if (units <= 0) {
      if (stock <= 0) return { ...base, menuClass: 'idle', reason: 'No sales in this range and none in stock.' };
      const since = daysSinceLastSale === null ? 'Never sold' : `Last sold ${daysSinceLastSale} day${daysSinceLastSale === 1 ? '' : 's'} ago`;
      return {
        ...base,
        menuClass: 'unsold',
        reason: `${since}; ${stock} in stock. Consider dropping or discounting it.`,
      };
    }

    const high = units >= medianUnits;
    const good = marginPct === null || marginPct >= GOOD_MARGIN_PCT;
    const m = marginPct === null ? '' : ` at ${marginPct.toFixed(0)}% margin`;
    if (high && good) return { ...base, menuClass: 'star', reason: `Sells well${m}. Always keep it in stock.` };
    if (high) return { ...base, menuClass: 'thin', reason: `Sells well but earns little${m}. Try a small price rise or a cheaper supplier.` };
    if (good) return { ...base, menuClass: 'gem', reason: `Sells slowly but earns well${m}. Try promoting it.` };
    return { ...base, menuClass: 'slow', reason: `Sells slowly${m}. A candidate to drop if it keeps tying up stock.` };
  });
}

// ---------- Restock ----------

export type RestockReason = 'out' | 'below' | 'soon';

export interface RestockRow {
  productId: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  unitsPerSellingDay: number;
  daysLeft: number | null; // selling days of stock left; null when no recent sales
  reason: RestockReason;
  reasonText: string;
  suggestedQty: number;
  estimatedCost: number;
  supplier: string;
}

export interface RestockOptions {
  /** Flag products projected to run out within this many selling days. */
  runOutWithinDays: number;
  /** Suggest enough to cover this many selling days of sales. */
  coverDays: number;
  now?: Date;
  lookbackDays?: number;
}

export function buildRestockList(products: Product[], allTx: Transaction[], opts: RestockOptions): RestockRow[] {
  const now = opts.now ?? new Date();
  const lookback = opts.lookbackDays ?? RESTOCK_LOOKBACK_DAYS;
  const from = addDays(startOfDay(now), -(lookback - 1)).getTime();
  const to = addDays(startOfDay(now), 1).getTime();

  const units = new Map<string, number>();
  const tradingDays = new Set<string>();
  for (const tx of allTx) {
    const ts = toDate(tx.timestamp);
    if (!ts) continue;
    const t = ts.getTime();
    if (t < from || t >= to) continue;
    tradingDays.add(toDayKey(ts));
    for (const item of tx.items ?? []) {
      const q = Number(item.quantity) || 0;
      units.set(item.product?.id, (units.get(item.product?.id) ?? 0) + q);
    }
  }
  const sellingDays = tradingDays.size;

  const rows: RestockRow[] = [];
  for (const p of products) {
    const stock = Math.max(0, Number(p.stock) || 0);
    const reorder = Math.max(0, Number(p.reorderLevel) || 0);
    const sold = Math.max(0, units.get(p.id) ?? 0);
    const rate = sellingDays > 0 ? sold / sellingDays : 0;
    const daysLeft = rate > 0 ? stock / rate : null;
    const belowLevel = reorder > 0 && stock <= reorder;
    const soon = daysLeft !== null && daysLeft <= opts.runOutWithinDays;
    if (!belowLevel && !soon) continue;

    const reason: RestockReason = stock === 0 ? 'out' : belowLevel ? 'below' : 'soon';
    const target = Math.max(reorder * 2, Math.ceil(rate * opts.coverDays));
    const suggestedQty = Math.max(1, target - stock);
    const unitCost = Number(p.unitCost) || 0;
    const reasonText =
      reason === 'out'
        ? 'Out of stock'
        : reason === 'below'
          ? `${stock} left, at or below the reorder level of ${reorder}`
          : `About ${daysLeft!.toFixed(1)} selling days left`;
    rows.push({
      productId: p.id,
      name: p.name,
      category: p.category || 'Uncategorized',
      stock,
      reorderLevel: reorder,
      unitsPerSellingDay: rate,
      daysLeft,
      reason,
      reasonText: reason === 'below' && daysLeft !== null ? `${reasonText} (about ${daysLeft.toFixed(1)} selling days left)` : reasonText,
      suggestedQty,
      estimatedCost: suggestedQty * unitCost,
      supplier: p.supplier ?? '',
    });
  }

  const urgency = (r: RestockRow) => (r.reason === 'out' ? -1 : r.daysLeft ?? Number.MAX_SAFE_INTEGER);
  return rows.sort((a, b) => urgency(a) - urgency(b) || a.stock - b.stock || a.name.localeCompare(b.name));
}

function csvCell(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function restockToCsv(rows: RestockRow[]): string {
  const header = ['Product', 'Category', 'Supplier', 'In stock', 'Reorder level', 'Units per selling day', 'Selling days left', 'Why', 'Suggested order qty', 'Estimated cost'];
  const lines = rows.map((r) =>
    [
      r.name,
      r.category,
      r.supplier,
      r.stock,
      r.reorderLevel,
      r.unitsPerSellingDay.toFixed(2),
      r.daysLeft === null ? '' : r.daysLeft.toFixed(1),
      r.reasonText,
      r.suggestedQty,
      r.estimatedCost.toFixed(2),
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\n');
}
