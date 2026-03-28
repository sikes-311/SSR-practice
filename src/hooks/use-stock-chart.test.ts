import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockChartResponse } from '@/types/stock';
import { useStockChart } from './use-stock-chart';

const mockChartResponse: StockChartResponse = {
  symbol: 'AAPL',
  prices: [
    { date: '2025-09-27', price: 172.5 },
    { date: '2025-10-27', price: 175.0 },
    { date: '2025-11-27', price: 178.0 },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useStockChart', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('正常系: 指定した symbol・period で正しい URL を fetch する', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockChartResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Act
    const { result } = renderHook(() => useStockChart('AAPL', '6m'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/stocks/AAPL/chart?period=6m');
  });

  it('正常系: レスポンスデータが正しく返される', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockChartResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Act
    const { result } = renderHook(() => useStockChart('AAPL', '1y'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.symbol).toBe('AAPL');
    expect(result.current.data?.prices).toHaveLength(3);
    expect(result.current.data?.prices[0].price).toBe(172.5);
  });

  it('正常系: period を変えると異なる URL で fetch される', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockChartResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Act
    const { result } = renderHook(() => useStockChart('AAPL', '10y'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/stocks/AAPL/chart?period=10y');
  });

  it('異常系: API が ok でないレスポンスを返したとき isError が true になる', async () => {
    // Arrange
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Bad Gateway' }), { status: 502 }),
    );

    // Act
    const { result } = renderHook(() => useStockChart('AAPL', '6m'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('異常系: fetch がネットワークエラーを投げたとき isError が true になる', async () => {
    // Arrange
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network Error'));

    // Act
    const { result } = renderHook(() => useStockChart('AAPL', '6m'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
