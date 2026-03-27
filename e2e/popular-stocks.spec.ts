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

// @SC-4: 各株価カード内に銘柄名・株価・前日比(%)・株価表示日付が表示される
test('SC-4: 各株価カード内に銘柄名・株価・前日比(%)・株価表示日付が表示される', async ({
  page,
}) => {
  await loginAsTestUser(page);
  const firstCard = page.locator('[data-testid="stock-card"]').first();
  await expect(firstCard.locator('[data-testid="stock-symbol"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-name"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-price"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-change-percent"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-price-date"]')).toBeVisible();
});

// @SC-5: 「その他の株価を見る」をタップすると株価一覧ページへ遷移する
test('SC-5: 「その他の株価を見る」をタップすると株価一覧ページへ遷移する', async ({ page }) => {
  await loginAsTestUser(page);
  await page.locator('[data-testid="view-all-stocks"]').click();
  await expect(page).toHaveURL('/stocks');
});

// @SC-6: 株価取得APIエラー時に「現在株価を表示できません。」が表示される
test('SC-6: 株価取得APIエラー時に「現在株価を表示できません。」が表示される', async ({ page }) => {
  // 1. ログイン（エラーモード有効化前に実施）
  await loginAsTestUser(page);
  // 2. エラーモード有効化
  await page.request.post(`${MOCK_ADMIN_A}/force-error`);
  // 3. トップページを再表示（株価取得がエラーになる）
  await page.reload();
  // 4. エラーメッセージ確認
  await expect(page.locator('[data-testid="stock-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="stock-error"]')).toHaveText(
    '現在株価を表示できません。',
  );
  await expect(page.locator('[data-testid="stock-card"]')).toHaveCount(0);
});
