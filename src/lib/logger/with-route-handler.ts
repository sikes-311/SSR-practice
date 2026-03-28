import 'server-only';
import { type NextRequest, NextResponse } from 'next/server';
import { UnauthorizedError } from '@/lib/session';
import { logger } from './index';

export type RouteContext = { request_id: string };

type NextRouteContext = { params: Promise<Record<string, string | string[]>> };

type RouteHandler = (
  request: NextRequest,
  ctx: RouteContext,
  routeCtx?: NextRouteContext,
) => Promise<NextResponse>;

/**
 * Route Handler のログラッパー（docs/LOGGING.md §10.6）
 * - リクエスト開始・終了ログを自動出力
 * - UnauthorizedError を 401 に変換してログ出力
 * - 予期しない例外を ERROR ログ出力して 500 を返す
 * - Next.js 動的ルートパラメータ（params）を透過する
 */
export function withRouteHandler(handler: RouteHandler) {
  return async (request: NextRequest, routeCtx?: NextRouteContext): Promise<NextResponse> => {
    const request_id = crypto.randomUUID();
    const start = Date.now();
    const method = request.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
    const path = request.nextUrl.pathname;

    logger.info({
      message: 'HTTPリクエスト開始',
      'event.name': 'http_request_started',
      'event.category': 'web',
      request_id,
      'http.method': method,
      'url.path': path,
    });

    try {
      const response = await handler(request, { request_id }, routeCtx);

      logger.info({
        message: 'HTTPリクエスト完了',
        'event.name': 'http_request_completed',
        'event.category': 'web',
        request_id,
        'http.method': method,
        'url.path': path,
        'http.status_code': response.status,
        duration_ms: Date.now() - start,
      });

      return response;
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        logger.warn({
          message: '認証エラー',
          'event.name': 'unauthorized_access',
          'event.category': 'authentication',
          request_id,
          'http.method': method,
          'url.path': path,
          'http.status_code': 401,
          duration_ms: Date.now() - start,
          'error.code': 'AUTH_UNAUTHORIZED',
          'error.type': 'UnauthorizedError',
          'error.message': e.message,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      logger.error({
        message: '予期しないエラー',
        'event.name': 'unexpected_error',
        'event.category': 'web',
        request_id,
        'http.method': method,
        'url.path': path,
        'http.status_code': 500,
        duration_ms: Date.now() - start,
        'error.code': 'UNEXPECTED_INTERNAL_ERROR',
        'error.type': e instanceof Error ? e.constructor.name : 'UnknownError',
        'error.message': e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}
