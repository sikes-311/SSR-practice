# アーキテクチャ

## ディレクトリ構成と責務

```
src/
├── app/
│   ├── (auth)/           # 未認証ページ（ログイン等）
│   ├── (app)/            # 認証済みページ（layout.tsx でセッションチェック）
│   ├── actions/          # Server Actions（更新系）
│   │   └── {feature}.ts
│   └── api/              # Route Handlers（BFF層）
│       ├── auth/
│       └── {feature}/route.ts
├── components/
│   ├── ui/               # 汎用 UI（Button, Input 等）
│   └── features/{feature}/ # 機能別コンポーネント
├── hooks/                # TanStack Query フック（Client Component 用）
├── lib/
│   ├── session.ts        # iron-session 設定・requireSession()
│   ├── db/
│   │   ├── index.ts      # Drizzle クライアント
│   │   └── schema/       # テーブル定義（1機能1ファイル）
│   └── downstream/       # 外部 API クライアント（1機能1ファイル）
└── types/                # BFF ↔ フロントエンドの型コントラクト
e2e/                      # Playwright テスト
mock-server.mjs           # Downstream モックサーバー（port 4001/4002）
```

---

## アーキテクチャ境界（dependency-cruiser で強制済み）

`npm run arch` で自動チェック。違反すると CI が落ちる。

```
components/ / hooks/  →  app/api/        ❌ 直接 import 禁止
components/ / hooks/  →  lib/db/         ❌ 直接 import 禁止
components/ / hooks/  →  lib/downstream/ ❌ 直接 import 禁止
components/ / hooks/  →  lib/session     ❌ 直接 import 禁止
```

フロントエンドが BFF にアクセスする唯一の方法は `fetch('/api/...')` のみ。

---

## Server Component vs Client Component の判断基準

| 条件 | 種別 |
|---|---|
| データ取得のみ、インタラクションなし | Server Component（デフォルト） |
| `useState` / `useEffect` / イベントハンドラ | `'use client'` |
| TanStack Query（`useQuery` 等） | `'use client'` |
| フォーム（React Hook Form） | `'use client'` |
