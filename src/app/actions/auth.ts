'use server';

import { redirect } from 'next/navigation';
import { AuthenticationError, loginDownstream } from '@/lib/downstream/auth-client';
import { logger } from '@/lib/logger';
import { type ActionContext, withServerAction } from '@/lib/logger/with-server-action';
import { getSession } from '@/lib/session';

type LoginActionState = {
  error?: string;
};

async function loginActionHandler(
  ctx: ActionContext,
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }

  logger.info({
    message: 'ログイン試行',
    'event.name': 'login_attempted',
    'event.category': 'authentication',
    request_id: ctx.request_id,
  });

  try {
    const { sessionId } = await loginDownstream(email, password);

    const session = await getSession();
    session.sessionId = sessionId;
    await session.save();

    logger.info({
      message: 'ログイン成功',
      'event.name': 'login_succeeded',
      'event.category': 'authentication',
      request_id: ctx.request_id,
    });
  } catch (e) {
    if (e instanceof AuthenticationError) {
      logger.warn({
        message: 'ログイン失敗（認証エラー）',
        'event.name': 'login_failed',
        'event.category': 'authentication',
        request_id: ctx.request_id,
        'error.code': 'AUTH_INVALID_CREDENTIALS',
        'error.type': 'AuthenticationError',
        'error.message': e.message,
      });
      return { error: 'メールアドレスまたはパスワードが正しくありません。' };
    }
    throw e;
  }

  redirect('/');
}

export const loginAction = withServerAction<LoginActionState>(loginActionHandler);
