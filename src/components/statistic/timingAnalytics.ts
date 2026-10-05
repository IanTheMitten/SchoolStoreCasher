// Pure helpers for "busy times" (weekday x break heatmap) and "bought together" pairs.
import type { Transaction } from '../../App';
import { toDayKey } from '../analytics/sharedAggregation';
import { CANONICAL_TIME_PERIODS, getPeriodIdForTimestamp } from './timePeriodAnalytics';
import { toDate } from './profitAnalytics';

export interface HeatmapCell {
  weekdayIndex: number; // 1..5 (Mon..Fri)
  periodId: string;
  transactions: number;
  /** Average transactions per trading day of that weekday (distinct days with any sale). */
  avgPerDay: number;
}

export interface Heatmap {
  periods: { id: string; label: string }[];
  weekdays: { index: number; label: string; daysObserved: number }[];
  cells: HeatmapCell[]; // weekday-major
  max: number;
  outsideBreaks: number; // weekday transactions that do not fall in a defined break window
  weekendTransactions: number;
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function buildHeatmap(transactions: Transaction[]): Heatmap {
  const counts = new Map<string, number>();
  const days: Set<string>[] = WD.map(() => new Set<string>());
  let outside = 0;
  let weekend = 0;
  for (const tx of transactions) {
    const ts = toDate(tx.timestamp);
    if (!ts) continue;
    const dow = ts.getDay();
    if (dow === 0 || dow === 6) {
      weekend += 1;
      continue;
    }
    days[dow - 1].add(toDayKey(ts));
    const pid = getPeriodIdForTimestamp(ts);
    if (!pid) {
      outside += 1;
      continue;
    }
    const k = `${dow}|${pid}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const cells: HeatmapCell[] = [];
  let max = 0;
  WD.forEach((_, i) => {
    for (const p of CANONICAL_TIME_PERIODS) {
      const n = counts.get(`${i + 1}|${p.id}`) ?? 0;
      const d = days[i].size;
      const avg = d > 0 ? n / d : 0;
      max = Math.max(max, avg);
      cells.push({ weekdayIndex: i + 1, periodId: p.id, transactions: n, avgPerDay: avg });
    }
  });
  return {
    periods: CANONICAL_TIME_PERIODS.map((p) => ({ id: p.id, label: p.label })),
    weekdays: WD.map((label, i) => ({ index: i + 1, label, daysObserved: days[i].size })),
    cells,
    max,
    outsideBreaks: outside,
    weekendTransactions: weekend,
  };
}

export interface PairRow {
  a: { id: string; name: string };
  b: { id: string; name: string };
  together: number;
  /** Share of baskets containing A that also contain B, and vice versa. */
  pctOfA: number;
  pctOfB: number;
}

/** Products most often in the same basket. Only pairs seen at least `minTogether` times are returned. */
export function frequentPairs(transactions: Transaction[], limit = 8, minTogether = 2): PairRow[] {
  const single = new Map<string, number>();
  const names = new Map<string, string>();
  const pairs = new Map<string, number>();
  for (const tx of transactions) {
    const ids = new Set<string>();
    for (const item of tx.items ?? []) {
      if (!item.product?.id || !(Number(item.quantity) > 0)) continue;
      ids.add(item.product.id);
      names.set(item.product.id, item.product.name);
    }
    const list = Array.from(ids).sort();
    for (const id of list) single.set(id, (single.get(id) ?? 0) + 1);
    // Guard against pathological huge baskets.
    const capped = list.slice(0, 30);
    for (let i = 0; i < capped.length; i++) {
      for (let j = i + 1; j < capped.length; j++) {
        const k = `${capped[i]}\u0000${capped[j]}`;
        pairs.set(k, (pairs.get(k) ?? 0) + 1);
      }
    }
  }
  return Array.from(pairs.entries())
    .filter(([, n]) => n >= minTogether)
    .map(([k, n]) => {
      const [x, y] = k.split('\u0000');
      return {
        a: { id: x, name: names.get(x) ?? x },
        b: { id: y, name: names.get(y) ?? y },
        together: n,
        pctOfA: (n / (single.get(x) || 1)) * 100,
        pctOfB: (n / (single.get(y) || 1)) * 100,
      };
    })
    .sort((p, q) => q.together - p.together || Math.max(q.pctOfA, q.pctOfB) - Math.max(p.pctOfA, p.pctOfB))
    .slice(0, limit);
}
