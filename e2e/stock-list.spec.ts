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

// @SC-1: 株価一覧がデフォルト（値上がり順）で表示される
test('SC-1: 株価一覧がデフォルト（値上がり順）で表示される', async ({ page }) => {
  // Arrange: ログインしてトップページを表示する
  await loginAsTestUser(page);

  // Act: 「その他の株価を見る」をタップして株価一覧ページへ遷移する
  await page.locator('[data-testid="view-all-stocks"]').click();

  // Assert: 株価一覧ページが表示され、値上がり順に並んでいる
  await expect(page).toHaveURL('/stocks');

  const cards = page.locator('[data-testid="stock-list-card"]');
  await expect(cards.first()).toBeVisible();

  await expect(cards.nth(0).locator('[data-testid="stock-list-name"]')).toContainText(
    'トヨタ自動車',
  );
  await expect(cards.nth(1).locator('[data-testid="stock-list-name"]')).toContainText(
    'ソニーグループ',
  );
  await expect(cards.nth(2).locator('[data-testid="stock-list-name"]')).toContainText('任天堂');
});

// @SC-2: 並び替えドロップダウンで値下がり順に変更できる
test('SC-2: 並び替えドロップダウンで値下がり順に変更できる', async ({ page }) => {
  // Arrange: ログイン後、株価一覧ページを直接開く（値上がり順のデフォルト状態）
  await loginAsTestUser(page);
  await page.goto('/stocks');
  await page.waitForLoadState('networkidle');

  const cards = page.locator('[data-testid="stock-list-card"]');
  await expect(cards.first()).toBeVisible();

  // Act: 並び替えドロップダウンで値下がり順を選択する
  await page.locator('[data-testid="sort-select"]').selectOption('asc');

  // Assert: 値下がり順に並び替えられている
  await expect(cards.nth(0).locator('[data-testid="stock-list-name"]')).toContainText('任天堂');
  await expect(cards.nth(1).locator('[data-testid="stock-list-name"]')).toContainText(
    'ソニーグループ',
  );
  await expect(cards.nth(2).locator('[data-testid="stock-list-name"]')).toContainText(
    'トヨタ自動車',
  );
});

// @SC-3: 株価取得APIエラー時にエラーメッセージが表示される
test('SC-3: 株価取得APIエラー時にエラーメッセージが表示される', async ({ page }) => {
  // Arrange: ログイン後、Service A をエラーモードに切り替える
  await loginAsTestUser(page);
  await page.request.post(`${MOCK_ADMIN_A}/force-error`);

  // Act: 株価一覧ページを開く
  await page.goto('/stocks');
  await page.waitForLoadState('networkidle');

  // Assert: 株価カードの代わりにエラーメッセージが表示される
  await expect(page.locator('[data-testid="stock-list-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="stock-list-card"]')).toHaveCount(0);
});
