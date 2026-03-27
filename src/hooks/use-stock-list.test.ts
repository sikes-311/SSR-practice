import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockListResponse } from '@/types/stock';
import { useStockList } from './use-stock-list';

const mockStockListResponse: StockListResponse = {
  stocks: [
    {
      symbol: 'TOYOTA',
      name: 'トヨタ自動車',
      changePercentA: 1.6,
      changePercentB: 2.0,
      averageChangePercent: 1.8,
      priceDate: '2026-03-21',
    },
    {
      symbol: 'SONY',
      name: 'ソニーグループ',
      changePercentA: 1.4,
      changePercentB: 2.0,
      averageChangePercent: 1.7,
      priceDate: '2026-03-21',
    },
    {
      symbol: 'NINTENDO',
      name: '任天堂',
      changePercentA: -1.4,
      changePercentB: 2.0,
      averageChangePercent: 0.3,
      priceDate: '2026-03-21',
    },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useStockList', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('正常系: /api/stocks のレスポンスから stocks が返される', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockStockListResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Act
    const { result } = renderHook(() => useStockList(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.stocks).toHaveLength(3);
    expect(result.current.data?.stocks[0].symbol).toBe('TOYOTA');
    expect(result.current.data?.stocks[0].averageChangePercent).toBe(1.8);
    expect(global.fetch).toHaveBeenCalledWith('/api/stocks');
  });

  it('正常系: 3銘柄すべてのデータが正しく返される', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockStockListResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Act
    const { result } = renderHook(() => useStockList(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const stocks = result.current.data?.stocks ?? [];
    expect(stocks[1].symbol).toBe('SONY');
    expect(stocks[1].averageChangePercent).toBe(1.7);
    expect(stocks[2].symbol).toBe('NINTENDO');
    expect(stocks[2].averageChangePercent).toBe(0.3);
  });

  it('異常系: API が ok でないレスポンスを返したとき isError が true になる', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 502,
      }),
    );

    // Act
    const { result } = renderHook(() => useStockList(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('異常系: fetch がネットワークエラーを投げたとき isError が true になる', async () => {
    // Arrange
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network Error'));

    // Act
    const { result } = renderHook(() => useStockList(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
