import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DOWNSTREAM_URL = 'https://api.example.com';

vi.hoisted(() => {
  process.env.DOWNSTREAM_API_URL = 'https://api.example.com';
});

import { DownstreamError, getPopularStocks } from './stock-client';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('getPopularStocks', () => {
  it('正常系: GET /stocks/popular を呼び snake_case → camelCase 変換が行われる', async () => {
    // Arrange
    const downstream = {
      stocks: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.0,
          change_percent: 2.35,
          price_date: '2026-03-22',
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(downstream),
      }),
    );

    // Act
    const result = await getPopularStocks('session-123');

    // Assert
    expect(fetch).toHaveBeenCalledWith(`${DOWNSTREAM_URL}/stocks/popular`, {
      headers: { 'X-Session-Id': 'session-123' },
      cache: 'no-store',
    });
    expect(result).toEqual({
      stocks: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.0,
          changePercent: 2.35,
          priceDate: '2026-03-22',
        },
      ],
    });
  });

  it('正常系: X-Session-Id ヘッダーが正しく付与される', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ stocks: [] }),
      }),
    );

    // Act
    await getPopularStocks('my-session-id');

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'X-Session-Id': 'my-session-id' },
      }),
    );
  });

  it('異常系: fetch が失敗した場合に DownstreamError をスローする', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    // Act & Assert
    await expect(getPopularStocks('session-123')).rejects.toThrow(DownstreamError);
    await expect(getPopularStocks('session-123')).rejects.toThrow('Downstream stock error: 500');
  });
});
