import { expect, type Page, test } from '@playwright/test';

const MOCK_ADMIN_A = 'http://localhost:4001/admin';
const MOCK_ADMIN_B = 'http://localhost:4002/admin';

/** テストユーザーでログインする */
async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.locator('[data-testid="login-email"]').fill('user@example.com');
  await page.locator('[data-testid="login-password"]').fill('password123');
  await page.locator('[data-testid="login-submit"]').click();
  await page.waitForURL('/');
}

/** Downstream のエラーモードを解除する */
async function clearErrorMode() {
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/clear-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/clear-error`, { method: 'POST' }),
  ]);
}

test.afterEach(async () => {
  await clearErrorMode();
});

// @SC-1: トップページの「チャートを見る」からデフォルト6ヶ月チャートが表示される
test('SC-1: トップページの「チャートを見る」からデフォルト6ヶ月チャートが表示される', async ({
  page,
}) => {
  // Arrange: ログインしてトップページで人気上位5銘柄の株価が表示されている
  await loginAsTestUser(page);
  await expect(page.locator('[data-testid="stock-card"]')).toHaveCount(5);

  // Act: Apple Inc. の株価カードの「チャートを見る」ボタン（最初のもの）をクリックする
  await page.locator('[data-testid="chart-view-button"]').first().click();

  // Assert: Apple Inc. の株価チャートページが表示される
  await expect(page).toHaveURL('/stocks/AAPL/chart');
  await expect(page.locator('[data-testid="stock-chart-page"]')).toBeVisible();

  // Assert: 表示期間として「6ヶ月」が選択されている
  await expect(page.locator('[data-testid="period-button-6m"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Assert: 折れ線グラフが表示されている
  await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible();
});
