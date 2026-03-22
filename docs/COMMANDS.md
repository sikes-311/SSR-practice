# コマンド・環境変数

## コマンド早見表

```bash
npm run dev          # 開発サーバー起動（Turbopack）
npm run build        # プロダクションビルド
npm run lint         # biome + oxlint
npm run check        # biome format + lint（自動修正）
npm run test         # Vitest（ユニットテスト）
npm run test:watch   # Vitest ウォッチモード
npm run arch         # dependency-cruiser（構造境界チェック）
npm run e2e          # Playwright（E2Eテスト）
npm run db:generate  # Drizzle マイグレーションファイル生成
npm run db:migrate   # マイグレーション実行
node mock-server.mjs # Downstream モックサーバー起動
```

---

## 環境変数

`.env.local` に記載する（`.gitignore` 済み）。

| 変数 | 用途 | 必須 |
|---|---|---|
| `SESSION_SECRET` | iron-session 暗号化キー（32文字以上） | ✅ |
| `DATABASE_URL` | PostgreSQL 接続文字列 | ✅ |
| `DOWNSTREAM_API_URL` | 下流サービスのベース URL | ✅ |
| `NEXT_PUBLIC_VERSION` | gitコミットSHA短縮形（ログ用） | ✅ |
