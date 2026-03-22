import { expect, type Page, test } from '@playwright/test';

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

// @SC-2: 誤った認証情報ではログインに失敗しエラーが表示される
test('SC-2: 誤った認証情報ではログインに失敗しエラーが表示される', async ({ page }) => {
  await page.goto('/login');
  await page.locator('[data-testid="login-email"]').fill('user@example.com');
  await page.locator('[data-testid="login-password"]').fill('wrongpassword');
  await page.locator('[data-testid="login-submit"]').click();
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

/** テストユーザーでログインする */
async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.locator('[data-testid="login-email"]').fill('user@example.com');
  await page.locator('[data-testid="login-password"]').fill('password123');
  await page.locator('[data-testid="login-submit"]').click();
  await page.waitForURL('/');
}

// @SC-3: ログイン後トップページで人気上位5銘柄の株価カードが表示される
test('SC-3: ログイン後トップページで人気上位5銘柄の株価カードが表示される', async ({ page }) => {
  await loginAsTestUser(page);
  await expect(page.locator('[data-testid="stock-card"]')).toHaveCount(5);
});
