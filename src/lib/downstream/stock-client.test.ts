import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DOWNSTREAM_URL = 'https://api.example.com';
const DOWNSTREAM_URL_B = 'https://api-b.example.com';

vi.hoisted(() => {
  process.env.DOWNSTREAM_API_URL = 'https://api.example.com';
  process.env.DOWNSTREAM_API_URL_B = 'https://api-b.example.com';
});

import { DownstreamError, getAllStocks, getPopularStocks, getStockChart } from './stock-client';

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

describe('getStockChart', () => {
  it('正常系: Service A・B に正しいパラメータ（from/to）を渡し、日付ごとに price を平均する', async () => {
    // Arrange
    const chartA = {
      prices: [
        { date: '2025-09-27', price: 170.0 },
        { date: '2025-10-27', price: 173.0 },
      ],
    };
    const chartB = {
      prices: [
        { date: '2025-09-27', price: 180.0 },
        { date: '2025-10-27', price: 177.0 },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chartA) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chartB) }),
    );

    // Act
    const result = await getStockChart('session-123', 'AAPL', '2025-03-27', '2025-09-27');

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      `${DOWNSTREAM_URL}/stocks/AAPL/chart?from=2025-03-27&to=2025-09-27`,
      { headers: { 'X-Session-Id': 'session-123' }, cache: 'no-store' },
    );
    expect(fetch).toHaveBeenCalledWith(
      `${DOWNSTREAM_URL_B}/stocks/AAPL/chart?from=2025-03-27&to=2025-09-27`,
      { headers: { 'X-Session-Id': 'session-123' }, cache: 'no-store' },
    );
    expect(result.symbol).toBe('AAPL');
    expect(result.prices).toHaveLength(2);
    expect(result.prices[0]).toEqual({ date: '2025-09-27', price: 175.0 });
    expect(result.prices[1]).toEqual({ date: '2025-10-27', price: 175.0 });
  });

  it('正常系: 片方のサービスにしかないデータポイントはそのまま返す', async () => {
    // Arrange
    const chartA = {
      prices: [
        { date: '2025-09-27', price: 170.0 },
        { date: '2025-11-27', price: 180.0 },
      ],
    };
    const chartB = {
      prices: [
        { date: '2025-09-27', price: 180.0 },
        { date: '2025-10-27', price: 177.0 },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chartA) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chartB) }),
    );

    // Act
    const result = await getStockChart('session-123', 'AAPL', '2025-03-27', '2025-11-27');

    // Assert
    expect(result.prices).toHaveLength(3);
    // 日付でソートされている
    expect(result.prices[0].date).toBe('2025-09-27');
    expect(result.prices[0].price).toBe(175.0); // 平均
    expect(result.prices[1].date).toBe('2025-10-27');
    expect(result.prices[1].price).toBe(177.0); // B のみ
    expect(result.prices[2].date).toBe('2025-11-27');
    expect(result.prices[2].price).toBe(180.0); // A のみ
  });

  it('正常系: レスポンスが日付昇順でソートされる', async () => {
    // Arrange
    const chartA = {
      prices: [
        { date: '2025-12-01', price: 200.0 },
        { date: '2025-09-01', price: 170.0 },
      ],
    };
    const chartB = {
      prices: [
        { date: '2025-12-01', price: 210.0 },
        { date: '2025-09-01', price: 180.0 },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chartA) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chartB) }),
    );

    // Act
    const result = await getStockChart('session-123', 'AAPL', '2025-09-01', '2025-12-01');

    // Assert
    expect(result.prices[0].date).toBe('2025-09-01');
    expect(result.prices[1].date).toBe('2025-12-01');
  });

  it('異常系: Service A がエラーを返す場合に DownstreamError がスローされる', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ prices: [] }) }),
    );

    // Act
    const promise = getStockChart('session-123', 'AAPL', '2025-03-27', '2025-09-27');

    // Assert
    await expect(promise).rejects.toThrow(DownstreamError);
    await expect(promise).rejects.toThrow('Downstream Service A chart error: 500');
  });

  it('異常系: Service B がエラーを返す場合に DownstreamError がスローされる', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ prices: [] }) })
        .mockResolvedValueOnce({ ok: false, status: 503 }),
    );

    // Act
    const promise = getStockChart('session-123', 'AAPL', '2025-03-27', '2025-09-27');

    // Assert
    await expect(promise).rejects.toThrow(DownstreamError);
    await expect(promise).rejects.toThrow('Downstream Service B chart error: 503');
  });
});
