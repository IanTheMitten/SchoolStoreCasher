import { DollarSign, TrendingDown, TrendingUp, ShoppingCart } from 'lucide-react';
import { Card } from '../ui/card';
import { useCurrency } from '../../contexts/CurrencyContext';
import type { Transaction, Expense } from '../../App';

interface KPICardsProps {
  transactions: Transaction[];
  expenses: Expense[];
}

export function KPICards({ transactions, expenses }: KPICardsProps) {
  const { formatCurrency } = useCurrency();
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const transactionCount = transactions.length;

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      title: 'Net Profit',
      value: formatCurrency(netProfit),
      icon: TrendingUp,
      bgColor: netProfit >= 0 ? 'bg-green-100' : 'bg-red-100',
      iconColor: netProfit >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Transactions',
      value: transactionCount.toString(),
      icon: ShoppingCart,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`size-12 ${card.bgColor} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`size-6 ${card.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-600 text-sm truncate">{card.title}</div>
                <div className="text-gray-900 truncate">{card.value}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
