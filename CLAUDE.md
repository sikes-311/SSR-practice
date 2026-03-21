@AGENTS.md

# プロジェクト概要

Next.js App Router のみで構成したフルスタックアプリケーション。フロントエンドと BFF（Backend For Frontend）を単一の Next.js アプリで担う。

## 技術スタック

| 用途 | 技術 |
|---|---|
| フレームワーク | Next.js (App Router) |
| BFF | Route Handlers (`src/app/api/`) |
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

## ディレクトリ構成と責務

```
src/
├── app/
│   ├── (auth)/           # 未認証ページ（ログイン等）
│   ├── (app)/            # 認証済みページ（layout.tsx でセッションチェック）
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

## アーキテクチャの境界（tool 強制済み）

dependency-cruiser が以下を自動チェックする（`npm run arch`）。違反すると CI が落ちる。

```
components/ / hooks/  →  app/api/      ❌ 直接 import 禁止
components/ / hooks/  →  lib/db/       ❌ 直接 import 禁止
components/ / hooks/  →  lib/downstream/ ❌ 直接 import 禁止
components/ / hooks/  →  lib/session   ❌ 直接 import 禁止
```

フロントエンドが BFF にアクセスする唯一の方法は `fetch('/api/...')` のみ。

## 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| ファイル | kebab-case | `user-profile.tsx` |
| コンポーネント | PascalCase export | `export function UserProfile()` |
| フック | `use-` prefix（ファイル）/ `use` prefix（関数） | `use-users.ts` / `useUsers()` |
| Route Handler | `route.ts` 固定 | `src/app/api/users/route.ts` |
| Drizzle スキーマ | 機能名単数形 | `src/lib/db/schema/user.ts` |
| Downstream クライアント | `{feature}-client.ts` | `src/lib/downstream/user-client.ts` |
| 型定義 | `{feature}.ts` | `src/types/user.ts` |

## Route Handler のパターン

```typescript
// src/app/api/{feature}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, UnauthorizedError } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // 1. 認証
    const session = await requireSession();

    // 2. バリデーション（クエリパラメータ）
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);

    // 3. ビジネスロジック（DB or Downstream）
    const data = await getFeatures(session.sessionId, page);

    // 4. 変換・計算
    return NextResponse.json({ data: data.map(toFeatureResponse) });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### エラーレスポンス統一形式

```typescript
{ error: 'Unauthorized' }          // 401
{ error: 'Not Found' }             // 404
{ error: 'Bad Request', details: ... } // 400
{ error: 'Internal Server Error' } // 500
{ error: 'Bad Gateway' }           // 502（Downstream エラー）
```

## Server Component vs Client Component の判断基準

| 条件 | 種別 |
|---|---|
| データ取得のみ、インタラクションなし | Server Component（デフォルト） |
| `useState` / `useEffect` / イベントハンドラ | `'use client'` |
| TanStack Query（`useQuery` 等） | `'use client'` |
| フォーム（React Hook Form） | `'use client'` |

Server Component は `fetch('/api/...')` で Route Handler を呼ぶ。
Client Component は `useQuery` / `useMutation` 経由でフックを使う。

## 認証フロー

```
1. ユーザーが POST /api/auth/login にメール/パスワードを送信
2. Route Handler が下流認証サービスに転送
3. 下流サービスが sessionId を返す
4. iron-session が sessionId を暗号化して Cookie にセット
5. 以降のリクエストは requireSession() で Cookie を検証
```

セッションオブジェクト（`src/lib/session.ts`）:
```typescript
interface SessionData {
  sessionId: string;
  permissions?: string[]; // 将来的に権限情報を持たせる可能性あり
}
```

## 環境変数

| 変数 | 用途 | 必須 |
|---|---|---|
| `SESSION_SECRET` | iron-session 暗号化キー（32文字以上） | ✅ |
| `DATABASE_URL` | PostgreSQL 接続文字列 | ✅ |
| `DOWNSTREAM_API_URL` | 下流サービスのベース URL | ✅ |

`.env.local` に記載する（`.gitignore` 済み）。

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
