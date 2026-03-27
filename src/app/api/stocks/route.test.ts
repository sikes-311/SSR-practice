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
  getAllStocks: vi.fn(),
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
      handler: (req: NextRequest, ctx: { request_id: string }) => Promise<Response>,
    ) => {
      return async (request: NextRequest): Promise<Response> => {
        const ctx = { request_id: 'test-request-id' };
        try {
          return await handler(request, ctx);
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

import { DownstreamError, getAllStocks } from '@/lib/downstream/stock-client';
import { requireSession } from '@/lib/session';
import { GET } from './route';

describe('GET /api/stocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @SC-1: 株価一覧がデフォルト（値上がり順）で表示される
  it('正常系: 認証済みセッションで 200 と StockListResponse が返る', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });
    vi.mocked(getAllStocks).mockResolvedValue({
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
    });

    const request = new NextRequest('http://localhost/api/stocks');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.stocks).toHaveLength(3);
    expect(body.stocks[0].symbol).toBe('TOYOTA');
    expect(body.stocks[0].averageChangePercent).toBe(1.8);
    expect(getAllStocks).toHaveBeenCalledWith('session-123');
  });

  // @SC-3: 未認証時
  it('異常系: 未認証の場合に 401 が返る', async () => {
    // Arrange
    const { UnauthorizedError } = await import('@/lib/session');
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const request = new NextRequest('http://localhost/api/stocks');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  // @SC-3: Downstream エラー時
  it('異常系: DownstreamError 発生時に 502 が返る', async () => {
    // Arrange
    vi.mocked(requireSession).mockResolvedValue({ sessionId: 'session-123' });
    const { DownstreamError: DE } = await import('@/lib/downstream/stock-client');
    vi.mocked(getAllStocks).mockRejectedValue(new DE('Downstream Service A stock error: 500'));

    const request = new NextRequest('http://localhost/api/stocks');

    // Act
    const response = await GET(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(502);
    expect(body.error).toBe('Bad Gateway');
  });
});
