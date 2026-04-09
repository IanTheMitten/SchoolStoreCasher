import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Product, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { CANONICAL_TIME_PERIODS, getPeriodIdForTimestamp } from './timePeriodAnalytics';

type StatisticDateRange = 'today' | 'thisWeek' | 'thisMonth' | 'allTime' | 'custom';

interface StatisticPageProps {
  transactions: Transaction[];
  products: Product[];
}

interface DateBounds {
  start: Date | null;
  end: Date | null;
}

interface DateRangeOption {
  value: StatisticDateRange;
  label: string;
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'allTime', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const toDateInputValue = (date: Date | null): string => {
  if (!date) {
    return '';
  }

  return toDayKey(date);
};

const parseDateInputValue = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const formatDayKeyAsLocalDate = (dayKey: string): string => {
  const localDate = parseDateInputValue(dayKey);
  return localDate ? localDate.toLocaleDateString('en-US') : dayKey;
};

function getDateBounds(range: StatisticDateRange, customStart: Date | null, customEnd: Date | null): DateBounds {
  const now = new Date();

  if (range === 'allTime') {
    return { start: null, end: null };
  }

  if (range === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (range === 'thisWeek') {
    const currentDay = now.getDay();
    const diffToMonday = (currentDay + 6) % 7;
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday));
    return { start, end: endOfDay(now) };
  }

  if (range === 'thisMonth') {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end: endOfDay(now) };
  }

  return {
    start: customStart ? startOfDay(customStart) : null,
    end: customEnd ? endOfDay(customEnd) : null,
  };
}

export function StatisticPage({ transactions, products }: StatisticPageProps) {
  const { formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState<StatisticDateRange>('thisMonth');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(CANONICAL_TIME_PERIODS[0].id);

  const dateBounds = useMemo(
    () => getDateBounds(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd],
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (dateBounds.start && transaction.timestamp < dateBounds.start) {
        return false;
      }

      if (dateBounds.end && transaction.timestamp > dateBounds.end) {
        return false;
      }

      return true;
    });
  }, [transactions, dateBounds]);

  const totalRevenue = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0),
    [filteredTransactions],
  );

  const unitsSold = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + transaction.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    [filteredTransactions],
  );

  const transactionCount = filteredTransactions.length;
  const avgBasketSize = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  const weekdayChartData = useMemo(() => {
    const totals = WEEKDAY_LABELS.map((weekday, index) => ({ weekday, weekdayIndex: index, revenue: 0, transactions: 0 }));

    filteredTransactions.forEach((transaction) => {
      const dayIndex = transaction.timestamp.getDay();
      totals[dayIndex].revenue += transaction.total;
      totals[dayIndex].transactions += 1;
    });

    return totals;
  }, [filteredTransactions]);

  const timePeriodChartData = useMemo(() => {
    const totalsByPeriod = new Map<string, { periodId: string; periodLabel: string; revenue: number; transactions: number }>(
      CANONICAL_TIME_PERIODS.map((period) => [
        period.id,
        {
          periodId: period.id,
          periodLabel: period.label,
          revenue: 0,
          transactions: 0,
        },
      ]),
    );

    filteredTransactions.forEach((transaction) => {
      const periodId = getPeriodIdForTimestamp(transaction.timestamp);
      if (!periodId) {
        return;
      }

      const existing = totalsByPeriod.get(periodId);
      if (!existing) {
        return;
      }

      existing.revenue += transaction.total;
      existing.transactions += 1;
    });

    return CANONICAL_TIME_PERIODS.map((period) => totalsByPeriod.get(period.id)!);
  }, [filteredTransactions]);

  const topProducts = useMemo(() => {
    const productLookup = new Map(products.map((product) => [product.id, product]));
    const totals = new Map<string, { productId: string; name: string; units: number; revenue: number }>();

    filteredTransactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const existing = totals.get(item.product.id) ?? {
          productId: item.product.id,
          name: productLookup.get(item.product.id)?.name ?? item.product.name,
          units: 0,
          revenue: 0,
        };

        existing.units += item.quantity;
        existing.revenue += item.quantity * item.product.price;
        totals.set(item.product.id, existing);
      });
    });

    return Array.from(totals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredTransactions, products]);

  const bestDays = useMemo(() => {
    const totals = new Map<string, { dayKey: string; revenue: number; transactions: number; units: number }>();

    filteredTransactions.forEach((transaction) => {
      const dayKey = toDayKey(transaction.timestamp);
      const existing = totals.get(dayKey) ?? { dayKey, revenue: 0, transactions: 0, units: 0 };

      existing.revenue += transaction.total;
      existing.transactions += 1;
      existing.units += transaction.items.reduce((sum, item) => sum + item.quantity, 0);
      totals.set(dayKey, existing);
    });

    return Array.from(totals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredTransactions]);

  const topCustomers = useMemo(() => {
    const totals = new Map<string, { customerId: string; revenue: number; transactions: number; units: number }>();

    filteredTransactions.forEach((transaction) => {
      const customerId = transaction.studentId || 'Walk-in';
      const existing = totals.get(customerId) ?? { customerId, revenue: 0, transactions: 0, units: 0 };

      existing.revenue += transaction.total;
      existing.transactions += 1;
      existing.units += transaction.items.reduce((sum, item) => sum + item.quantity, 0);
      totals.set(customerId, existing);
    });

    return Array.from(totals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredTransactions]);

  const selectedPeriodSeries = useMemo(() => {
    const points = filteredTransactions
      .filter((transaction) => getPeriodIdForTimestamp(transaction.timestamp) === selectedPeriodId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let runningRevenue = 0;

    return points.map((transaction, index) => {
      runningRevenue += transaction.total;
      return {
        point: index + 1,
        cumulativeRevenue: runningRevenue,
        timestampLabel: transaction.timestamp.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      };
    });
  }, [filteredTransactions, selectedPeriodId]);

  return (
    <div className="h-[calc(100vh-70px)] overflow-auto">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-gray-900">Statistics</h2>
            <p className="text-sm text-gray-600 mt-1">Factual analytics from the selected date range.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {DATE_RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={dateRange === option.value ? 'default' : 'outline'}
                  onClick={() => setDateRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="statistics-custom-start">Start date</Label>
                  <input
                    id="statistics-custom-start"
                    type="date"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                    value={toDateInputValue(customStart)}
                    onChange={(event) => setCustomStart(parseDateInputValue(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statistics-custom-end">End date</Label>
                  <input
                    id="statistics-custom-end"
                    type="date"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                    value={toDateInputValue(customEnd)}
                    onChange={(event) => setCustomEnd(parseDateInputValue(event.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase text-gray-500 tracking-wide">Total Revenue</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(totalRevenue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-gray-500 tracking-wide">Units Sold</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{unitsSold.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-gray-500 tracking-wide">Transactions</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{transactionCount.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-gray-500 tracking-wide">Avg Basket Size</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(avgBasketSize)}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-gray-900">Weekday Revenue</h3>
            <p className="text-sm text-gray-600 mt-1">Total revenue by day of week for filtered transactions.</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekdayChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="weekday" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-gray-900">Time-Period Revenue</h3>
              <p className="text-sm text-gray-600 mt-1">Click a bar to inspect cumulative transactions for that period.</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timePeriodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="periodLabel" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar
                  dataKey="revenue"
                  radius={[6, 6, 0, 0]}
                  onClick={(entry) => {
                    if (entry?.periodId) {
                      setSelectedPeriodId(entry.periodId);
                    }
                  }}
                >
                  {timePeriodChartData.map((entry) => (
                    <Cell
                      key={entry.periodId}
                      fill={selectedPeriodId === entry.periodId ? '#1d4ed8' : '#3b82f6'}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-gray-900">Selected Period Running Revenue</h3>
              <p className="text-sm text-gray-600 mt-1">{CANONICAL_TIME_PERIODS.find((period) => period.id === selectedPeriodId)?.label ?? selectedPeriodId}</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={selectedPeriodSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="point" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => {
                    const point = selectedPeriodSeries.find((item) => item.point === label);
                    return point?.timestampLabel ?? `Point ${label}`;
                  }}
                />
                <Bar dataKey="cumulativeRevenue" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-gray-900">Top Products</h3>
            <p className="text-sm text-gray-600 mt-1">Top products by revenue in the selected range.</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-gray-600">Product</th>
                  <th className="p-2 text-right text-gray-600">Units</th>
                  <th className="p-2 text-right text-gray-600">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topProducts.map((row) => (
                  <tr key={row.productId}>
                    <td className="p-2 text-gray-900">{row.name}</td>
                    <td className="p-2 text-right text-gray-700">{row.units.toLocaleString()}</td>
                    <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td className="p-2 text-center text-gray-500" colSpan={3}>No product sales in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-gray-900">Best Days</h3>
              <p className="text-sm text-gray-600 mt-1">Highest-revenue transaction days.</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left text-gray-600">Date</th>
                    <th className="p-2 text-right text-gray-600">Transactions</th>
                    <th className="p-2 text-right text-gray-600">Units</th>
                    <th className="p-2 text-right text-gray-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bestDays.map((row) => (
                    <tr key={row.dayKey}>
                      <td className="p-2 text-gray-900">{formatDayKeyAsLocalDate(row.dayKey)}</td>
                      <td className="p-2 text-right text-gray-700">{row.transactions.toLocaleString()}</td>
                      <td className="p-2 text-right text-gray-700">{row.units.toLocaleString()}</td>
                      <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                  {bestDays.length === 0 && (
                    <tr>
                      <td className="p-2 text-center text-gray-500" colSpan={4}>No daily activity in this range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-gray-900">Top Customers</h3>
              <p className="text-sm text-gray-600 mt-1">Customers ranked by revenue contribution.</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left text-gray-600">Customer</th>
                    <th className="p-2 text-right text-gray-600">Transactions</th>
                    <th className="p-2 text-right text-gray-600">Units</th>
                    <th className="p-2 text-right text-gray-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topCustomers.map((row) => (
                    <tr key={row.customerId}>
                      <td className="p-2 text-gray-900">{row.customerId}</td>
                      <td className="p-2 text-right text-gray-700">{row.transactions.toLocaleString()}</td>
                      <td className="p-2 text-right text-gray-700">{row.units.toLocaleString()}</td>
                      <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && (
                    <tr>
                      <td className="p-2 text-center text-gray-500" colSpan={4}>No customer activity in this range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
