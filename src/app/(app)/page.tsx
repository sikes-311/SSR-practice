import Link from 'next/link';
import { StockCard } from '@/components/features/stock/stock-card';
import { getPopularStocks } from '@/lib/downstream/stock-client';
import { requireSession } from '@/lib/session';
import type { PopularStocksResponse } from '@/types/stock';

export default async function TopPage() {
  const session = await requireSession();

  let stockData: PopularStocksResponse | null = null;
  let hasError = false;

  try {
    stockData = await getPopularStocks(session.sessionId);
  } catch {
    hasError = true;
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <h1 className="text-2xl font-bold">トップページ</h1>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">人気銘柄</h2>
          <Link
            href="/stocks"
            data-testid="view-all-stocks"
            className="text-sm text-blue-600 hover:underline"
          >
            その他の株価を見る
          </Link>
        </div>

        {hasError ? (
          <p data-testid="stock-error" className="text-red-600">
            現在株価を表示できません。
          </p>
        ) : (
          <div
            data-testid="stock-list"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {stockData?.stocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
