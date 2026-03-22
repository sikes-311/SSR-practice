import { expect, test } from '@playwright/test';

const MOCK_ADMIN_A = 'http://localhost:4001/admin';

/** Downstream のエラーモードを解除する */
async function clearErrorMode() {
  await fetch(`${MOCK_ADMIN_A}/clear-error`, { method: 'POST' });
}

test.afterEach(async () => {
  await clearErrorMode();
});

// @SC-1: 正しい認証情報でログインしてトップページへ遷移できる
test('SC-1: 正しい認証情報でログインしてトップページへ遷移できる', async ({ page }) => {
  await page.goto('/login');
  await page.locator('[data-testid="login-email"]').fill('user@example.com');
  await page.locator('[data-testid="login-password"]').fill('password123');
  await page.locator('[data-testid="login-submit"]').click();
  await expect(page).toHaveURL('/');
});
