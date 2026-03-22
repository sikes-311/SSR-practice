'use server';

import { redirect } from 'next/navigation';
import { AuthenticationError, loginDownstream } from '@/lib/downstream/auth-client';
import { getSession } from '@/lib/session';

type LoginActionState = {
  error?: string;
};

export async function loginAction(
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

  try {
    const { sessionId } = await loginDownstream(email, password);

    const session = await getSession();
    session.sessionId = sessionId;
    await session.save();
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { error: 'メールアドレスまたはパスワードが正しくありません。' };
    }
    console.error('Login error:', e);
    return { error: 'ログインに失敗しました。しばらく経ってからお試しください。' };
  }

  redirect('/');
}
