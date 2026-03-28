import { useQuery } from '@tanstack/react-query';
import type { StockChartResponse } from '@/types/stock';

export const stockChartKeys = {
  all: ['stockChart'] as const,
  detail: (symbol: string, period: string) => ['stockChart', symbol, period] as const,
};

async function fetchStockChart(symbol: string, period: string): Promise<StockChartResponse> {
  const res = await fetch(
    `/api/stocks/${encodeURIComponent(symbol)}/chart?period=${encodeURIComponent(period)}`,
  );
  if (!res.ok) {
    throw new Error('株価チャートの取得に失敗しました');
  }
  return res.json() as Promise<StockChartResponse>;
}

export function useStockChart(symbol: string, period: string) {
  return useQuery({
    queryKey: stockChartKeys.detail(symbol, period),
    queryFn: () => fetchStockChart(symbol, period),
    retry: false,
  });
}
