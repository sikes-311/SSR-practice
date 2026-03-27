import { useQuery } from '@tanstack/react-query';
import type { StockListResponse } from '@/types/stock';

export const stockListKeys = {
  all: ['stockList'] as const,
  list: () => ['stockList', 'list'] as const,
};

async function fetchStockList(): Promise<StockListResponse> {
  const res = await fetch('/api/stocks');
  if (!res.ok) {
    throw new Error('株価一覧の取得に失敗しました');
  }
  return res.json() as Promise<StockListResponse>;
}

export function useStockList() {
  return useQuery({
    queryKey: stockListKeys.list(),
    queryFn: fetchStockList,
    retry: false,
  });
}
