import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// server-only を使うモジュールをモック
vi.mock('server-only', () => ({}));

vi.mock('@/lib/session', () => ({
  requireSession: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {
    readonly status = 401;
    constructor() {
      super('Unauthorized');
    }
  },
}));

vi.mock('@/lib/downstream/stock-client', () => ({
  getStockChart: vi.fn(),
  DownstreamError: class DownstreamError extends Error {
    readonly status = 502;
    constructor(message: string) {
      super(message);
    }
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/logger/with-route-handler', async () => {
  const { UnauthorizedError } = await import('@/lib/session');
  const { logger } = await import('@/lib/logger');
  const { NextResponse } = await import('next/server');

  return {
    withRouteHandler: (
      handler: (
        req: NextRequest,
        ctx: { request_id: string },
        routeCtx?: { params: Promise<Record<string, string | string[]>> },
      ) => Promise<Response>,
    ) => {
      return async (
        request: NextRequest,
        routeCtx?: { params: Promise<Record<string, string | string[]>> },
      ): Promise<Response> => {
        const ctx = { request_id: 'test-request-id' };
        try {
          return await handler(request, ctx, routeCtx);
        } catch (e) {
          if (e instanceof UnauthorizedError) {
            logger.warn({
              message: '認証エラー',
              'event.name': 'unauthorized_access',
              'event.category': 'authentication',
              request_id: ctx.request_id,
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          logger.error({
            message: '予期しないエラー',
            'event.name': 'unexpected_error',
            'event.category': 'web',
            request_id: ctx.request_id,
          });
          return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
      };
    },
  };
});

import { DownstreamError, getStockChart } from '@/lib/downstream/stock-client';
import { requireSession } from '@/lib/session';
import { GET } from './route';

function makeRouteCtx(symbol: string) {
  return { params: Promise.resolve({ symbol }) };
}

describe('GET /api/stocks/[symbol]/chart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @SC-1: 未認証時に 401 を返す
  it('異常系: 未認証の場合に 401 が返る', async () => {
    // Arrange
    const { UnauthorizedError } = await import('@/lib/session');
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const request = new NextRequest('http://localhost/api/stocks/AAPL/chart?period=6m');

    // Act
    const response = await GET(request, makeRouteCtx('AAPL'));
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  // @SC-1: period が不正値の場合に 400 を返す
  it('異常系: period が不正値の場合に 400 が返る', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });

    const request = new NextRequest('http://localhost/api/stocks/AAPL/chart?period=3m');

    // Act
    const response = await GET(request, makeRouteCtx('AAPL'));
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Bad Request');
  });

  // @SC-1: 正常系 — Downstream から取得した price を日付ごとに平均して返す
  it('正常系: 認証済みリクエストで chart データを返す', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });
    vi.mocked(getStockChart).mockResolvedValue({
      symbol: 'AAPL',
      prices: [
        { date: '2025-09-27', price: 175.0 },
        { date: '2025-10-27', price: 176.5 },
      ],
    });

    const request = new NextRequest('http://localhost/api/stocks/AAPL/chart?period=6m');

    // Act
    const response = await GET(request, makeRouteCtx('AAPL'));
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.symbol).toBe('AAPL');
    expect(body.prices).toHaveLength(2);
    expect(body.prices[0]).toEqual({ date: '2025-09-27', price: 175.0 });
    expect(body.prices[1]).toEqual({ date: '2025-10-27', price: 176.5 });
    expect(getStockChart).toHaveBeenCalledWith(
      'session-123',
      'AAPL',
      expect.any(String),
      expect.any(String),
    );
  });

  // @SC-1: period 省略時はデフォルト 6m が使われる
  it('正常系: period 省略時にデフォルト 6m として処理される', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });
    vi.mocked(getStockChart).mockResolvedValue({ symbol: 'AAPL', prices: [] });

    const request = new NextRequest('http://localhost/api/stocks/AAPL/chart');

    // Act
    const response = await GET(request, makeRouteCtx('AAPL'));

    // Assert
    expect(response.status).toBe(200);
    expect(getStockChart).toHaveBeenCalledWith(
      'session-123',
      'AAPL',
      expect.any(String),
      expect.any(String),
    );
  });

  // @SC-1: Downstream エラー時に 502 を返す
  it('異常系: DownstreamError 発生時に 502 が返る', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });
    const { DownstreamError: DE } = await import('@/lib/downstream/stock-client');
    vi.mocked(getStockChart).mockRejectedValue(new DE('Downstream Service A chart error: 500'));

    const request = new NextRequest('http://localhost/api/stocks/AAPL/chart?period=6m');

    // Act
    const response = await GET(request, makeRouteCtx('AAPL'));
    const body = await response.json();

    // Assert
    expect(response.status).toBe(502);
    expect(body.error).toBe('Bad Gateway');
  });

  // @SC-1: 予期しないエラー時に 500 を返す
  it('異常系: 予期しないエラー発生時に 500 が返る', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });
    vi.mocked(getStockChart).mockRejectedValue(new Error('Unexpected error'));

    const request = new NextRequest('http://localhost/api/stocks/AAPL/chart?period=6m');

    // Act
    const response = await GET(request, makeRouteCtx('AAPL'));
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
  });
});
