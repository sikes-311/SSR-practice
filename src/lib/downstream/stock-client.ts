import type { PopularStocksResponse, StockListResponse } from '@/types/stock';

const BASE_URL = process.env.DOWNSTREAM_API_URL!;
const BASE_URL_B = process.env.DOWNSTREAM_API_URL_B!;

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

type DownstreamAllStockDto = {
  symbol: string;
  name?: string;
  change_percent: number;
  price_date: string;
};

type DownstreamAllStocksDto = { stocks: DownstreamAllStockDto[] };

export async function getAllStocks(sessionId: string): Promise<StockListResponse> {
  const headers = { 'X-Session-Id': sessionId };

  const [resA, resB] = await Promise.all([
    fetch(`${BASE_URL}/stocks`, { headers, cache: 'no-store' }),
    fetch(`${BASE_URL_B}/stocks`, { headers, cache: 'no-store' }),
  ]);

  if (!resA.ok) {
    throw new DownstreamError(`Downstream Service A stock error: ${resA.status}`);
  }
  if (!resB.ok) {
    throw new DownstreamError(`Downstream Service B stock error: ${resB.status}`);
  }

  const dataA = (await resA.json()) as DownstreamAllStocksDto;
  const dataB = (await resB.json()) as DownstreamAllStocksDto;

  const mapB = new Map(dataB.stocks.map((s) => [s.symbol, s]));

  const stocks = dataA.stocks.map((stockA) => {
    const stockB = mapB.get(stockA.symbol);
    const changePercentA = stockA.change_percent;
    const changePercentB = stockB?.change_percent ?? 0;
    return {
      symbol: stockA.symbol,
      name: stockA.name ?? '',
      changePercentA,
      changePercentB,
      averageChangePercent: (changePercentA + changePercentB) / 2,
      priceDate: stockA.price_date,
    };
  });

  return { stocks };
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
