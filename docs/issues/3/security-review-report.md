# セキュリティレビューレポート - Issue #3

レビュー日時: 2026-03-28
レビュアー: security-review-agent
参照: OWASP Top 10 2021

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Critical（即時修正必須） | 0件 |
| 🔴 High（リリース前に修正必須） | 0件 |
| 🟡 Medium（次スプリントまでに修正） | 2件 |
| 🟢 Low（改善推奨） | 2件 |

## npm audit 結果

| パッケージ | 重要度 | 脆弱性 | 対応 |
|---|---|---|---|
| picomatch 4.0.0-4.0.3 | High | ReDoS（GHSA-3v7f-55p6-f55p）/ Method Injection（GHSA-c2c7-rcm5-vvqj） | 開発依存（dependency-cruiser, vite, vitest）のみ。本番ランタイムには含まれないため、リリースブロッカーではない。`npm audit fix` で修正可能 |
| esbuild <=0.24.2 | Moderate | dev server へのリクエスト漏洩（GHSA-67mh-4wv8-2f99） | 開発依存（drizzle-kit 経由）のみ。本番影響なし |

> **判定**: High 脆弱性は開発依存のみであり、本番バンドルには含まれない。リリースブロッカーではないが、`npm audit fix` での対応を推奨。

## 指摘事項

### 🟡 Medium

#### [OWASP A05] [next.config.ts] セキュリティヘッダー未設定
**問題**: `next.config.ts` が空の設定（`{}`）であり、セキュリティ関連の HTTP レスポンスヘッダーが設定されていない。
**攻撃シナリオ**: `X-Frame-Options` 未設定によるクリックジャッキング、`X-Content-Type-Options` 未設定による MIME スニッフィング攻撃が可能。
**修正案**: `next.config.ts` の `headers()` で以下を設定:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`（可能であれば）

**参考**: https://owasp.org/Top10/A05_2021-Security_Misconfiguration/

> **備考**: この指摘は Issue #3 固有ではなくプロジェクト全体に関わる。別 Issue での対応を推奨。

#### [OWASP A04] [src/app/api/stocks/[symbol]/chart/route.ts:32] symbol パラメータの形式バリデーション不足
**問題**: `symbol` は `pathname.split('/').at(-2)` で取得され、存在チェック（`!symbol`）のみ行われている。symbol の形式（英数字のみ等）のバリデーションがない。
**攻撃シナリオ**: 不正な symbol 値（長大な文字列、特殊文字等）が Downstream API に送信される可能性がある。ただし `encodeURIComponent` が適用されているため URL インジェクションのリスクは低い。
**修正案**: symbol に対する正規表現バリデーション（例: `/^[A-Z0-9.]{1,10}$/`）を追加し、不正値は 400 で返す。
**参考**: https://owasp.org/Top10/A04_2021-Insecure_Design/

### 🟢 Low

#### [OWASP A04] [src/lib/downstream/stock-client.ts:40,44] DownstreamError メッセージに HTTP ステータスコードが含まれる
**問題**: `DownstreamError` のメッセージに下流サービスのステータスコードが含まれている（例: `Downstream Service A chart error: 500`）。このメッセージはログに記録されるが、Route Handler のエラーハンドリングにより外部レスポンスには `{ error: "Bad Gateway" }` のみが返されるため、情報漏洩のリスクは低い。
**修正案**: 現状のまま問題なし。ログ出力での利用は適切。

#### [OWASP A09] 認証失敗・認可失敗のログ記録
**問題**: `withRouteHandler` で `UnauthorizedError` が `warn` レベルでログ記録されているが、ブルートフォース検出やアラート連携に必要な情報（IP アドレス、User-Agent 等）が含まれていない。
**修正案**: 将来的に認証失敗ログにリクエスト元情報を追加することを検討。
**参考**: https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/

## 確認済み（問題なし）の項目

### A01: アクセス制御の不備 ✅
- `route.ts:30` で `requireSession()` が正しく呼ばれている
- `withRouteHandler` ラッパーが `UnauthorizedError` を 401 に変換
- フロントエンドの `useStockChart` は `/api/` 経由のみでアクセス（アーキテクチャ境界遵守）

### A02: 暗号化の失敗 ✅
- `SESSION_SECRET` は `process.env.SESSION_SECRET` で環境変数から取得
- `.env*` が `.gitignore` に含まれている
- iron-session の Cookie に `httpOnly: true`、本番で `secure: true` が設定
- `cookieName: 'app_session'` はアプリ固有名
- sessionId はログに記録されていない

### A03: インジェクション ✅
- `symbol` は Downstream URL 構築時に `encodeURIComponent(symbol)` でエンコード済み（`stock-client.ts:110,114`）
- `from`/`to` パラメータも `encodeURIComponent` でエンコード済み（`stock-client.ts:107`）
- フロントエンド hook でも `encodeURIComponent(symbol)` と `encodeURIComponent(period)` を使用（`use-stock-chart.ts:11`）
- `dangerouslySetInnerHTML` の使用なし（grep で確認済み）
- Recharts はデータを DOM テキストとしてレンダリングするため XSS リスクは低い

### A07: 識別と認証の失敗 ✅
- セッション TTL は 24 時間（`maxAge: 60 * 60 * 24`）— 適切な範囲
- `requireSession()` で `sessionId` の存在を検証

### A08: ソフトウェアとデータの整合性の失敗 ✅
- `period` パラメータは `VALID_PERIODS` 配列でホワイトリスト検証（`route.ts:38`）
- クライアントサイドの `PeriodKey` 型に加え、サーバーサイドでもバリデーション実施

### A10: SSRF ✅
- Downstream URL は `process.env.DOWNSTREAM_API_URL` / `process.env.DOWNSTREAM_API_URL_B` で環境変数から固定
- ユーザー入力から URL が動的生成されていない（`symbol` はパスセグメントとして `encodeURIComponent` 経由で使用）
