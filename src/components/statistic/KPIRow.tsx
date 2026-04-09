import { useMemo } from 'react';
import type { Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';

interface KPIRowProps {
  transactions: Transaction[];
}

export function KPIRow({ transactions }: KPIRowProps) {
  const { formatCurrency } = useCurrency();

  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let unitsSold = 0;

    for (const tx of transactions) {
      totalRevenue += tx.total;
      for (const item of tx.items) {
        unitsSold += item.quantity;
      }
    }

    const transactionCount = transactions.length;
    const avgBasketSize = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    return { totalRevenue, unitsSold, transactionCount, avgBasketSize };
  }, [transactions]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-4">
        <p className="text-sm text-gray-600">Total Revenue</p>
        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(kpis.totalRevenue)}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-gray-600">Units Sold</p>
        <p className="text-2xl font-semibold text-gray-900">{kpis.unitsSold}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-gray-600">Transactions</p>
        <p className="text-2xl font-semibold text-gray-900">{kpis.transactionCount}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-gray-600">Avg Basket Size</p>
        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(kpis.avgBasketSize)}</p>
      </Card>
    </div>
  );
}
