@AGENTS.md

# プロジェクト概要

Next.js App Router のみで構成したフルスタックアプリケーション。フロントエンドと BFF（Backend For Frontend）を単一の Next.js アプリで担う。

---

## 技術スタック

| 用途 | 技術 |
|---|---|
| フレームワーク | Next.js (App Router) |
| BFF | Route Handlers (`src/app/api/`) + Server Actions (`src/app/actions/`) |
| 認証 | iron-session（下流サービスの sessionId を暗号化 Cookie に保存） |
| DB | PostgreSQL + Drizzle ORM |
| 状態管理 | TanStack Query（クライアント）/ Server Component fetch（サーバー） |
| バリデーション | Zod |
| フォーム | React Hook Form + Zod |
| Linter/Formatter | biome + oxlint |
| 構造境界チェック | dependency-cruiser（`npm run arch`） |
| ユニットテスト | Vitest + Testing Library |
| E2E テスト | Playwright + mock-server.mjs（Downstream モック） |
| デプロイ | Azure |

---

## 最重要制約

**フロントエンドから BFF への直接 import は禁止。`fetch('/api/...')` のみ許可。**
違反は `npm run arch` で自動検出され CI が落ちる。

---

## ドキュメント

詳細は各ドキュメントを参照。コードを書く前に必ず該当ドキュメントを確認すること。

| ドキュメント | 内容 |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | ディレクトリ構成・アーキテクチャ境界・Server/Client Component の判断基準 |
| [`docs/PATTERNS.md`](docs/PATTERNS.md) | データ取得パターン・Route Handler・Server Action の実装例 |
| [`docs/NAMING.md`](docs/NAMING.md) | ファイル・コンポーネント・フック等の命名規則 |
| [`docs/AUTH.md`](docs/AUTH.md) | 認証フロー・セッション管理・requireSession() の使い方 |
| [`docs/LOGGING.md`](docs/LOGGING.md) | 構造化ログ設計・フィールド定義・BFF/フロントのログルール |
| [`docs/COMMANDS.md`](docs/COMMANDS.md) | 開発コマンド・環境変数一覧 |
