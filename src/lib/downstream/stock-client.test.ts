import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DOWNSTREAM_URL = 'https://api.example.com';
const DOWNSTREAM_URL_B = 'https://api-b.example.com';

vi.hoisted(() => {
  process.env.DOWNSTREAM_API_URL = 'https://api.example.com';
  process.env.DOWNSTREAM_API_URL_B = 'https://api-b.example.com';
});

import { DownstreamError, getAllStocks, getPopularStocks } from './stock-client';

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

describe('getAllStocks', () => {
  it('正常系: Service A と B を並列取得して averageChangePercent が正しく計算される', async () => {
    // Arrange
    const downstreamA = {
      stocks: [
        { symbol: 'TOYOTA', name: 'トヨタ自動車', change_percent: 1.6, price_date: '2026-03-21' },
        { symbol: 'SONY', name: 'ソニーグループ', change_percent: 1.4, price_date: '2026-03-21' },
        { symbol: 'NINTENDO', name: '任天堂', change_percent: -1.4, price_date: '2026-03-21' },
      ],
    };
    const downstreamB = {
      stocks: [
        { symbol: 'TOYOTA', change_percent: 2.0, price_date: '2026-03-21' },
        { symbol: 'SONY', change_percent: 2.0, price_date: '2026-03-21' },
        { symbol: 'NINTENDO', change_percent: 2.0, price_date: '2026-03-21' },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(downstreamA) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(downstreamB) }),
    );

    // Act
    const result = await getAllStocks('session-123');

    // Assert
    expect(fetch).toHaveBeenCalledWith(`${DOWNSTREAM_URL}/stocks`, {
      headers: { 'X-Session-Id': 'session-123' },
      cache: 'no-store',
    });
    expect(fetch).toHaveBeenCalledWith(`${DOWNSTREAM_URL_B}/stocks`, {
      headers: { 'X-Session-Id': 'session-123' },
      cache: 'no-store',
    });
    expect(result.stocks).toHaveLength(3);
    const toyota = result.stocks.find((s) => s.symbol === 'TOYOTA');
    expect(toyota?.changePercentA).toBe(1.6);
    expect(toyota?.changePercentB).toBe(2.0);
    expect(toyota?.averageChangePercent).toBeCloseTo(1.8);
    const nintendo = result.stocks.find((s) => s.symbol === 'NINTENDO');
    expect(nintendo?.changePercentA).toBe(-1.4);
    expect(nintendo?.changePercentB).toBe(2.0);
    expect(nintendo?.averageChangePercent).toBeCloseTo(0.3);
  });

  it('異常系: Service A がエラーを返す場合に DownstreamError がスローされる', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ stocks: [] }) }),
    );

    // Act
    const promise = getAllStocks('session-123');

    // Assert
    await expect(promise).rejects.toThrow(DownstreamError);
    await expect(promise).rejects.toThrow('Downstream Service A stock error: 500');
  });

  it('異常系: Service B がエラーを返す場合に DownstreamError がスローされる', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ stocks: [] }) })
        .mockResolvedValueOnce({ ok: false, status: 503 }),
    );

    // Act
    const promise = getAllStocks('session-123');

    // Assert
    await expect(promise).rejects.toThrow(DownstreamError);
    await expect(promise).rejects.toThrow('Downstream Service B stock error: 503');
  });
});
