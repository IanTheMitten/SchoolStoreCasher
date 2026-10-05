import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import { pctChange, type Summary } from './profitAnalytics';
import { formatPct } from './shared';

interface Props {
  current: Summary;
  previous: Summary | null;
  previousLabel: string | null;
}

function Delta({ change, suffix = '%', pointsMode = false }: { change: number | null; suffix?: string; pointsMode?: boolean }) {
  if (change === null) return <span className="text-xs text-gray-400">no earlier data</span>;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return <span className="text-xs text-gray-500">no change</span>;
  const up = rounded > 0;
  return (
    <span className={`text-xs ${up ? 'text-green-700' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(rounded).toFixed(1)}
      {pointsMode ? ' pts' : suffix}
    </span>
  );
}

export function SummaryStrip({ current, previous, previousLabel }: Props) {
  const { formatCurrency } = useCurrency();
  const ch = (a: number, b: number | undefined) => (previous && b !== undefined ? pctChange(a, b) : null);
  const marginChange =
    previous && current.marginPct !== null && previous.marginPct !== null ? current.marginPct - previous.marginPct : null;

  const tiles = [
    { label: 'Revenue', hint: 'Money taken in', value: formatCurrency(current.revenue), delta: <Delta change={ch(current.revenue, previous?.revenue)} /> },
    { label: 'Profit', hint: 'Revenue minus what the items cost', value: formatCurrency(current.profit), delta: <Delta change={ch(current.profit, previous?.profit)} /> },
    { label: 'Margin', hint: 'Profit as a share of revenue', value: formatPct(current.marginPct, 1), delta: <Delta change={marginChange} pointsMode /> },
    { label: 'Transactions', hint: 'Number of sales', value: current.transactions.toLocaleString(), delta: <Delta change={ch(current.transactions, previous?.transactions)} /> },
    { label: 'Items sold', hint: 'Total units', value: current.itemsSold.toLocaleString(), delta: <Delta change={ch(current.itemsSold, previous?.itemsSold)} /> },
    { label: 'Average basket', hint: 'Revenue per sale', value: formatCurrency(current.avgBasket), delta: <Delta change={ch(current.avgBasket, previous?.avgBasket)} /> },
  ];

  return (
    <div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4 gap-1" title={t.hint}>
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.label}</p>
            <p className="text-2xl text-gray-900 truncate">{t.value}</p>
            <div>{t.delta}</div>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {previousLabel ? `Arrows compare with ${previousLabel}.` : 'Pick a date range (not All time) to see how it compares with the period before.'}
        {current.unknownCostLines > 0 &&
          ` ${current.unknownCostLines} of ${current.totalLines} sale lines have no known cost, so profit is slightly overstated.`}
      </p>
    </div>
  );
}
