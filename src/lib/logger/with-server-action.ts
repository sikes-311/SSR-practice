import 'server-only';
import { logger } from './index';

export type ActionContext = { request_id: string };

type ActionHandler<TState> = (
  ctx: ActionContext,
  prevState: TState,
  formData: FormData,
) => Promise<TState>;

/**
 * Next.js の redirect() が内部的にスローする特殊エラーを判定する
 * redirect() はエラーをスローして画面遷移を実現するため、ログ出力せずに再スローする
 */
function isRedirectError(e: unknown): boolean {
  return (
    e instanceof Error &&
    'digest' in e &&
    typeof (e as { digest: unknown }).digest === 'string' &&
    (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/**
 * Server Action のログラッパー（docs/LOGGING.md §10.5, §10.6）
 * - request_id をサーバー側で生成して ctx 経由でハンドラに渡す
 * - 予期しない例外を ERROR ログ出力して再スロー
 * - redirect() による特殊エラーはログ出力せずに再スロー
 */
export function withServerAction<TState>(handler: ActionHandler<TState>) {
  return async (prevState: TState, formData: FormData): Promise<TState> => {
    const request_id = crypto.randomUUID();
    try {
      return await handler({ request_id }, prevState, formData);
    } catch (e) {
      if (isRedirectError(e)) throw e;

      logger.error({
        message: '予期しないServer Actionエラー',
        'event.name': 'server_action_unexpected_error',
        'event.category': 'web',
        request_id,
        'error.code': 'UNEXPECTED_INTERNAL_ERROR',
        'error.type': e instanceof Error ? e.constructor.name : 'UnknownError',
        'error.message': e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  };
}
