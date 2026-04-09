import { useMemo, useState } from 'react';
import type { Product, Transaction } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Card } from '../ui/card';
import { topProducts } from './aggregation';

interface ProductAverageRevenueTableProps {
  transactions: Transaction[];
  products: Product[];
}

interface ProductRevenueRow {
  product: Product;
  revenue: number;
  quantity: number;
}

const TOP_LIMIT = 10;

export function ProductAverageRevenueTable({ transactions, products }: ProductAverageRevenueTableProps) {
  const { formatCurrency } = useCurrency();
  const [showAll, setShowAll] = useState(false);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const rows = useMemo(() => {
    return topProducts(transactions, Number.MAX_SAFE_INTEGER)
      .map((entry) => {
        const product = productById.get(entry.productId);
        if (!product) {
          return null;
        }

        const row: ProductRevenueRow = {
          product,
          revenue: entry.revenue,
          quantity: entry.quantity,
        };

        return row;
      })
      .filter((row): row is ProductRevenueRow => Boolean(row));
  }, [transactions, productById]);

  const visibleRows = showAll ? rows : rows.slice(0, TOP_LIMIT);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-gray-900">Top Products by Revenue</h3>
          <p className="text-sm text-gray-600 mt-1">
            Ranked from full filtered transactions (no sampling).
          </p>
        </div>

        {rows.length > TOP_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showAll ? 'Show top 10' : 'Show all'}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No product revenue available.</div>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-gray-600">Product</th>
                <th className="text-right p-2 text-gray-600">Revenue</th>
                <th className="text-right p-2 text-gray-600">Units Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleRows.map((row) => (
                <tr key={row.product.id} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-900">{row.product.name}</td>
                  <td className="p-2 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="p-2 text-right text-gray-700">{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
