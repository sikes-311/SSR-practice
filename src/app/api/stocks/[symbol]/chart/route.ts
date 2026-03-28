import { type NextRequest, NextResponse } from 'next/server';
import { DownstreamError, getStockChart } from '@/lib/downstream/stock-client';
import { logger } from '@/lib/logger';
import { type RouteContext, withRouteHandler } from '@/lib/logger/with-route-handler';
import { requireSession } from '@/lib/session';
import { calcFromDateJst, todayJst } from '@/lib/utils/date';

const VALID_PERIODS = ['6m', '1y', '2y', '10y'] as const;
type PeriodKey = (typeof VALID_PERIODS)[number];

async function getChartHandler(
  request: NextRequest,
  ctx: RouteContext,
  routeCtx?: { params: Promise<Record<string, string | string[]>> },
): Promise<NextResponse> {
  const session = await requireSession();

  const { symbol } = (await routeCtx?.params) ?? {};
  if (!symbol || typeof symbol !== 'string') {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const period = request.nextUrl.searchParams.get('period') ?? '6m';
  if (!VALID_PERIODS.includes(period as PeriodKey)) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const to = todayJst();
  const from = calcFromDateJst(period as PeriodKey);

  try {
    const data = await getStockChart(session.sessionId, symbol, from, to);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof DownstreamError) {
      logger.error({
        message: '下流API呼び出しエラー',
        'event.name': 'downstream_call_failed',
        'event.category': 'web',
        request_id: ctx.request_id,
        'downstream.service': 'stock-service',
        'downstream.endpoint': `/stocks/${symbol}/chart`,
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

export const GET = withRouteHandler(getChartHandler);
