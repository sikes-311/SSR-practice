# 実装パターン

## データ取得・更新パターン

### 判断フローチャート

```
データ操作の種別は？
├─ 更新系（POST/PUT/DELETE）
│   └─ → Server Action（`src/app/actions/{feature}.ts`）
│          └─ lib/downstream/ または lib/db/ を直接呼ぶ
└─ 参照系（GET）
    ├─ ユーザー操作なし（ページロード時に固定表示）
    │   └─ → Server Component が lib/downstream/ または lib/db/ を直接呼ぶ
    │          ※ Route Handler を経由しない（ループバック HTTP は不要なオーバーヘッド）
    └─ ユーザー操作あり（検索・フィルター・ページング等）
        └─ → Client Component + TanStack Query → Route Handler（`src/app/api/`）
               └─ lib/downstream/ または lib/db/ を呼ぶ
```

### 判断基準まとめ

| 条件 | パターン |
|---|---|
| ページロード時の固定データ取得 | Server Component → `lib/downstream/` 直接 |
| ユーザー操作を伴うデータ取得 | `'use client'` + `useQuery` → Route Handler |
| フォーム送信・作成・更新・削除 | Server Action |
| `useState` / `useEffect` / イベントハンドラ | `'use client'` |

> **注意**: 将来インタラクティブ化が予想される参照は、最初から Route Handler パターンで実装することを推奨。
> Server Component → Client Component への変更時は Route Handler と hook の追加が必要になる。

---

## Route Handler パターン

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
{ error: 'Unauthorized' }              // 401
{ error: 'Not Found' }                 // 404
{ error: 'Bad Request', details: ... } // 400
{ error: 'Internal Server Error' }     // 500
{ error: 'Bad Gateway' }               // 502（Downstream エラー）
```

---

## Server Action パターン

```typescript
// src/app/actions/{feature}.ts
'use server';
import { redirect } from 'next/navigation';
import { requireSession, UnauthorizedError } from '@/lib/session';

export async function createFeatureAction(formData: FormData) {
  try {
    const session = await requireSession();
    // バリデーション（Zod）
    // lib/downstream/ または lib/db/ を直接呼ぶ
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect('/login');
    }
    throw e;
  }
}
```
