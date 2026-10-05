// Pure aggregation helpers for the Statistic page (profit, series, comparisons).
// No React / DOM access so everything here can be unit-checked in isolation.
import type { Expense, Product, Transaction } from '../../App';
import { toDayKey, parseDayKey } from '../analytics/sharedAggregation';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  // Calendar arithmetic (DST safe) rather than adding milliseconds.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Whole calendar days from a to b (both truncated to local midnight). */
export function diffCalendarDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

export interface Line {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  costKnown: boolean;
}

/**
 * Economics of a single sale line.
 * Cost = the unit cost stored with the sale (App maps unitCostAtSale into item.product.unitCost);
 * when that is missing/zero, fall back to the current catalogue unit cost; if still unknown the
 * cost is treated as 0 and `costKnown` is false so the UI can say profit is approximate.
 */
export function lineEconomics(
  item: { product: { id: string; name: string; price: number; unitCost: number }; quantity: number },
  catalogCostById?: Map<string, number>,
): Line {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.product?.price) || 0;
  let unitCost = Number(item.product?.unitCost) || 0;
  if (!(unitCost > 0)) unitCost = catalogCostById?.get(item.product?.id) ?? 0;
  const costKnown = unitCost > 0;
  return {
    productId: item.product?.id ?? '',
    productName: item.product?.name ?? '',
    quantity,
    revenue: price * quantity,
    cost: costKnown ? unitCost * quantity : 0,
    costKnown,
  };
}

export function buildCostMap(products: Product[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of products) {
    const c = Number(p.unitCost);
    if (c > 0) m.set(p.id, c);
  }
  return m;
}

export interface Summary {
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number | null; // null when revenue is 0
  transactions: number;
  itemsSold: number;
  avgBasket: number;
  unknownCostLines: number;
  totalLines: number;
}

export function summarize(transactions: Transaction[], catalogCostById?: Map<string, number>): Summary {
  let revenue = 0;
  let cost = 0;
  let itemsSold = 0;
  let unknownCostLines = 0;
  let totalLines = 0;
  for (const tx of transactions) {
    for (const item of tx.items ?? []) {
      const l = lineEconomics(item, catalogCostById);
      revenue += l.revenue;
      cost += l.cost;
      itemsSold += l.quantity;
      totalLines += 1;
      if (!l.costKnown) unknownCostLines += 1;
    }
  }
  const profit = revenue - cost;
  const n = transactions.length;
  return {
    revenue,
    cost,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : null,
    transactions: n,
    itemsSold,
    avgBasket: n > 0 ? revenue / n : 0,
    unknownCostLines,
    totalLines,
  };
}

/** Percentage change; null when there is nothing to compare against (previous = 0). */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface RangeBounds {
  start?: Date;
  end?: Date;
}

/**
 * The equal-length period immediately before the selected range (inclusive day counts).
 * Returns null for open-ended ranges (e.g. All time) where no comparison makes sense.
 */
export function previousBounds(bounds: RangeBounds): { start: Date; end: Date; days: number } | null {
  if (!bounds.start || !bounds.end) return null;
  const start = startOfDay(bounds.start);
  const end = startOfDay(bounds.end);
  const days = diffCalendarDays(start, end) + 1;
  if (days < 1) return null;
  return { start: addDays(start, -days), end: addDays(start, -1), days };
}

/** Number of days the range covers; for open ranges derive it from first sale to today. */
export function rangeDays(bounds: RangeBounds, transactions: Transaction[], now = new Date()): number {
  if (bounds.start && bounds.end) {
    return Math.max(1, diffCalendarDays(bounds.start, bounds.end) + 1);
  }
  let min: Date | null = null;
  for (const tx of transactions) {
    const d = toDate(tx.timestamp);
    if (d && (!min || d < min)) min = d;
  }
  if (!min) return 1;
  return Math.max(1, diffCalendarDays(min, bounds.end ?? now) + 1);
}

// ---------- Time series ----------

export type Granularity = 'day' | 'week' | 'month';

export interface SeriesPoint {
  key: string;
  label: string;
  revenue: number;
  profit: number;
  transactions: number;
}

function mondayOf(d: Date): Date {
  const day = startOfDay(d);
  const sinceMonday = (day.getDay() + 6) % 7;
  return addDays(day, -sinceMonday);
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (d: Date) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;

function bucketStart(d: Date, g: Granularity): Date {
  if (g === 'day') return startOfDay(d);
  if (g === 'week') return mondayOf(d);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function nextBucket(d: Date, g: Granularity): Date {
  if (g === 'day') return addDays(d, 1);
  if (g === 'week') return addDays(d, 7);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function bucketLabel(d: Date, g: Granularity): string {
  if (g === 'month') return `${SHORT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  if (g === 'week') return `Wk ${fmtDay(d)}`;
  return fmtDay(d);
}

/** Revenue and profit per day / week (Mon start) / month. Gaps are filled for weeks and months. */
export function seriesByGranularity(
  transactions: Transaction[],
  g: Granularity,
  catalogCostById?: Map<string, number>,
): SeriesPoint[] {
  const map = new Map<string, { start: Date; revenue: number; cost: number; transactions: number }>();
  for (const tx of transactions) {
    const ts = toDate(tx.timestamp);
    if (!ts) continue;
    const start = bucketStart(ts, g);
    const key = toDayKey(start);
    const entry = map.get(key) ?? { start, revenue: 0, cost: 0, transactions: 0 };
    for (const item of tx.items ?? []) {
      const l = lineEconomics(item, catalogCostById);
      entry.revenue += l.revenue;
      entry.cost += l.cost;
    }
    entry.transactions += 1;
    map.set(key, entry);
  }
  if (map.size === 0) return [];
  const keys = Array.from(map.keys()).sort();
  if (g !== 'day') {
    let cur = parseDayKey(keys[0]);
    const last = parseDayKey(keys[keys.length - 1]);
    while (cur <= last) {
      const k = toDayKey(cur);
      if (!map.has(k)) map.set(k, { start: cur, revenue: 0, cost: 0, transactions: 0 });
      cur = nextBucket(cur, g);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: bucketLabel(v.start, g),
      revenue: v.revenue,
      profit: v.revenue - v.cost,
      transactions: v.transactions,
    }));
}

export function defaultGranularity(days: number): Granularity {
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

// ---------- Weekday pattern ----------

export interface WeekdayPoint {
  weekday: string;
  avgRevenue: number;
  avgProfit: number;
  totalRevenue: number;
  totalProfit: number;
  daysObserved: number;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Average revenue/profit per trading day for each weekday. Sat/Sun only included if they have sales. */
export function weekdayPattern(transactions: Transaction[], catalogCostById?: Map<string, number>): WeekdayPoint[] {
  const rows = WEEKDAY_NAMES.map((weekday) => ({
    weekday,
    revenue: 0,
    cost: 0,
    days: new Set<string>(),
  }));
  for (const tx of transactions) {
    const ts = toDate(tx.timestamp);
    if (!ts) continue;
    const row = rows[ts.getDay()];
    for (const item of tx.items ?? []) {
      const l = lineEconomics(item, catalogCostById);
      row.revenue += l.revenue;
      row.cost += l.cost;
    }
    row.days.add(toDayKey(ts));
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .map((i) => rows[i])
    .filter((r) => (r.weekday !== 'Sat' && r.weekday !== 'Sun') || r.days.size > 0)
    .map((r) => {
      const d = r.days.size;
      const profit = r.revenue - r.cost;
      return {
        weekday: r.weekday,
        avgRevenue: d > 0 ? r.revenue / d : 0,
        avgProfit: d > 0 ? profit / d : 0,
        totalRevenue: r.revenue,
        totalProfit: profit,
        daysObserved: d,
      };
    });
}

// ---------- Category / product breakdown ----------

export interface BreakdownRow {
  key: string;
  name: string;
  units: number;
  revenue: number;
  profit: number;
  marginPct: number | null;
  costKnown: boolean;
}

function finalize(rows: Map<string, Omit<BreakdownRow, 'profit' | 'marginPct'> & { cost: number }>): BreakdownRow[] {
  return Array.from(rows.values())
    .map((r) => {
      const profit = r.revenue - r.cost;
      return {
        key: r.key,
        name: r.name,
        units: r.units,
        revenue: r.revenue,
        profit,
        marginPct: r.revenue > 0 ? (profit / r.revenue) * 100 : null,
        costKnown: r.costKnown,
      };
    })
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || a.name.localeCompare(b.name));
}

export function breakdownByCategory(
  transactions: Transaction[],
  products: Product[],
): BreakdownRow[] {
  const catByProduct = new Map(products.map((p) => [p.id, p.category]));
  const costMap = buildCostMap(products);
  const rows = new Map<string, Omit<BreakdownRow, 'profit' | 'marginPct'> & { cost: number }>();
  for (const tx of transactions) {
    for (const item of tx.items ?? []) {
      const l = lineEconomics(item, costMap);
      const cat = (catByProduct.get(l.productId) || item.product?.category || '').trim() || 'Uncategorized';
      const r = rows.get(cat) ?? { key: cat, name: cat, units: 0, revenue: 0, cost: 0, costKnown: true };
      r.units += l.quantity;
      r.revenue += l.revenue;
      r.cost += l.cost;
      if (!l.costKnown) r.costKnown = false;
      rows.set(cat, r);
    }
  }
  return finalize(rows);
}

export function breakdownByProduct(transactions: Transaction[], products: Product[]): BreakdownRow[] {
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const costMap = buildCostMap(products);
  const rows = new Map<string, Omit<BreakdownRow, 'profit' | 'marginPct'> & { cost: number }>();
  for (const tx of transactions) {
    for (const item of tx.items ?? []) {
      const l = lineEconomics(item, costMap);
      const r =
        rows.get(l.productId) ?? {
          key: l.productId,
          name: nameById.get(l.productId) || l.productName || l.productId,
          units: 0,
          revenue: 0,
          cost: 0,
          costKnown: true,
        };
      r.units += l.quantity;
      r.revenue += l.revenue;
      r.cost += l.cost;
      if (!l.costKnown) r.costKnown = false;
      rows.set(l.productId, r);
    }
  }
  return finalize(rows);
}

// ---------- Expenses ----------

export interface ExpenseSummary {
  total: number;
  restock: number; // money spent buying stock
  other: number; // running costs etc.
  count: number;
}

export function isRestockExpense(e: Expense): boolean {
  return e.category === 'Inventory Purchase' || Number(e.purchaseQuantity) > 0;
}

export function summarizeExpenses(expenses: Expense[], bounds: RangeBounds): ExpenseSummary {
  const startMs = bounds.start ? startOfDay(bounds.start).getTime() : -Infinity;
  const endMs = bounds.end ? addDays(startOfDay(bounds.end), 1).getTime() : Infinity; // exclusive
  const out: ExpenseSummary = { total: 0, restock: 0, other: 0, count: 0 };
  for (const e of expenses) {
    const d = toDate(e.date);
    if (!d) continue;
    const t = d.getTime();
    if (t < startMs || t >= endMs) continue;
    const amt = Number(e.amount) || 0;
    out.total += amt;
    if (isRestockExpense(e)) out.restock += amt;
    else out.other += amt;
    out.count += 1;
  }
  return out;
}
