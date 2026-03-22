import type { PopularStocksResponse } from '@/types/stock';

const BASE_URL = process.env.DOWNSTREAM_API_URL!;

type DownstreamStockDto = {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  price_date: string;
};

type DownstreamPopularStocksDto = {
  stocks: DownstreamStockDto[];
};

export class DownstreamError extends Error {
  readonly status = 502;
}

export async function getPopularStocks(sessionId: string): Promise<PopularStocksResponse> {
  const res = await fetch(`${BASE_URL}/stocks/popular`, {
    headers: { 'X-Session-Id': sessionId },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new DownstreamError(`Downstream stock error: ${res.status}`);
  }

  const data = (await res.json()) as DownstreamPopularStocksDto;

  return {
    stocks: data.stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      changePercent: s.change_percent,
      priceDate: s.price_date,
    })),
  };
}
