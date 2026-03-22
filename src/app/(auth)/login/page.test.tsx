import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// useActionState をモックして状態を制御する
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

// loginAction をモック
vi.mock('@/app/actions/auth', () => ({
  loginAction: vi.fn(),
}));

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: ログインフォームが正しくレンダリングされる（email・password・submitボタン）', () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);

    // Act
    render(<LoginPage />);

    // Assert
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('正常系: email入力フィールドに値を入力できる', async () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);
    const user = userEvent.setup();

    // Act
    render(<LoginPage />);
    const emailInput = screen.getByLabelText('メールアドレス');
    await user.type(emailInput, 'user@example.com');

    // Assert
    expect(emailInput).toHaveValue('user@example.com');
  });

  it('正常系: password入力フィールドに値を入力できる', async () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);
    const user = userEvent.setup();

    // Act
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText('パスワード');
    await user.type(passwordInput, 'password123');

    // Assert
    expect(passwordInput).toHaveValue('password123');
  });

  it('正常系: 成功時はエラーメッセージが表示されない', () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);

    // Act
    render(<LoginPage />);

    // Assert
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  });

  it('異常系: Server Actionからエラーが返ったときエラーメッセージが表示される', () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([
      { error: 'メールアドレスまたはパスワードが正しくありません。' },
      vi.fn(),
      false,
    ]);

    // Act
    render(<LoginPage />);

    // Assert
    const errorEl = screen.getByTestId('login-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent('メールアドレスまたはパスワードが正しくありません。');
  });

  it('正常系: isPending中はボタンが「ログイン中...」になり無効化される', () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), true]);

    // Act
    render(<LoginPage />);

    // Assert
    const button = screen.getByRole('button', { name: 'ログイン中...' });
    expect(button).toBeDisabled();
  });

  it('正常系: useActionStateにloginActionと初期値が渡される', () => {
    // Arrange
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);

    // Act
    render(<LoginPage />);

    // Assert
    expect(useActionState).toHaveBeenCalledWith(loginAction, {});
  });
});
