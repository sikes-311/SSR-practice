import { type NextRequest, NextResponse } from 'next/server';
import { DownstreamError, getAllStocks } from '@/lib/downstream/stock-client';
import { logger } from '@/lib/logger';
import { type RouteContext, withRouteHandler } from '@/lib/logger/with-route-handler';
import { requireSession } from '@/lib/session';

async function getStocksHandler(_request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const session = await requireSession();

  try {
    const data = await getAllStocks(session.sessionId);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof DownstreamError) {
      logger.error({
        message: '下流API呼び出しエラー',
        'event.name': 'downstream_call_failed',
        'event.category': 'web',
        request_id: ctx.request_id,
        'downstream.service': 'stock-service',
        'downstream.endpoint': '/stocks',
        'http.status_code': 502,
        'error.code': 'BFF_DOWNSTREAM_ERROR',
        'error.type': 'DownstreamError',
        'error.message': e.message,
      });
      return NextResponse.json({ error: 'Bad Gateway' }, { status: 502 });
    }
    throw e;
  }
}

export const GET = withRouteHandler(getStocksHandler);
