import Link from 'next/link';
import type { StockResponse } from '@/types/stock';

type Props = {
  stock: StockResponse;
};

export function StockCard({ stock }: Props) {
  const isPositive = stock.changePercent >= 0;

  return (
    <div data-testid="stock-card" className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <span data-testid="stock-symbol" className="text-lg font-bold">
          {stock.symbol}
        </span>
        <span
          data-testid="stock-change-percent"
          className={isPositive ? 'text-green-600' : 'text-red-600'}
        >
          {isPositive ? '+' : ''}
          {stock.changePercent.toFixed(2)}%
        </span>
      </div>
      <p data-testid="stock-name" className="text-sm text-gray-600">
        {stock.name}
      </p>
      <p data-testid="stock-price" className="mt-2 text-2xl font-semibold">
        $
        {stock.price.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p data-testid="stock-price-date" className="mt-1 text-xs text-gray-400">
        {stock.priceDate}
      </p>
      <Link
        href={`/stocks/${stock.symbol}/chart`}
        data-testid="chart-view-button"
        className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        チャートを見る
      </Link>
    </div>
  );
}
