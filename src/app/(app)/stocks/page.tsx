'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStockList } from '@/hooks/use-stock-list';
import type { StockListItemResponse } from '@/types/stock';

type SortOrder = 'desc' | 'asc';

function formatChangePercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function sortStocks(stocks: StockListItemResponse[], order: SortOrder): StockListItemResponse[] {
  return [...stocks].sort((a, b) => {
    if (order === 'desc') {
      return b.averageChangePercent - a.averageChangePercent;
    }
    return a.averageChangePercent - b.averageChangePercent;
  });
}

export default function StocksPage() {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const { data, isLoading, isError } = useStockList();

  const sortedStocks = data ? sortStocks(data.stocks, sortOrder) : [];

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <h1 className="text-2xl font-bold">株価一覧</h1>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="sort-select" className="text-sm text-gray-700">
          並び替え
        </label>
        <select
          id="sort-select"
          data-testid="sort-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="desc">値上がり順</option>
          <option value="asc">値下がり順</option>
        </select>
      </div>

      {isLoading && (
        <div data-testid="stock-list-loading" className="mt-8 text-center text-gray-500">
          読み込み中...
        </div>
      )}

      {isError && (
        <p data-testid="stock-list-error" className="mt-8 text-red-600">
          株価情報を取得できませんでした。しばらく経ってから再度お試しください。
        </p>
      )}

      {!isLoading && !isError && sortedStocks.length === 0 && (
        <p className="mt-8 text-center text-gray-500">表示できる銘柄がありません。</p>
      )}

      {!isLoading && !isError && sortedStocks.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {sortedStocks.map((stock) => {
            const isPositiveAvg = stock.averageChangePercent >= 0;
            const isPositiveA = stock.changePercentA >= 0;
            const isPositiveB = stock.changePercentB >= 0;

            return (
              <div
                key={stock.symbol}
                data-testid="stock-list-card"
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex items-baseline justify-between">
                  <span data-testid="stock-list-name" className="text-lg font-bold">
                    {stock.name}
                  </span>
                  <span
                    className={`text-xl font-semibold ${isPositiveAvg ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatChangePercent(stock.averageChangePercent)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400">{stock.symbol}</p>

                <div className="mt-3 flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Service A: </span>
                    <span className={isPositiveA ? 'text-green-600' : 'text-red-600'}>
                      {formatChangePercent(stock.changePercentA)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Service B: </span>
                    <span className={isPositiveB ? 'text-green-600' : 'text-red-600'}>
                      {formatChangePercent(stock.changePercentB)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{stock.priceDate}</p>
                  <Link
                    href={`/stocks/${stock.symbol}/chart`}
                    data-testid="chart-button"
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    チャート
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
