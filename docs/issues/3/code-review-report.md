# コードレビューレポート - Issue #3 SC-1

レビュー日時: 2026-03-28
レビュアー: code-review-agent

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Must（リリース前に修正必須） | 1件 |
| 🟡 Should（できれば修正） | 3件 |
| 🟢 Nice to have（次回以降でOK） | 2件 |

## 指摘事項

### 🔴 Must

#### [src/app/api/stocks/[symbol]/chart/route.ts:32] symbol をパス文字列パースで取得している

**問題**: `request.nextUrl.pathname.split('/').at(-2)` でシンボルを取得しており、Next.js App Router の動的ルートパラメータ（`params`）を使用していない。

**理由**: URL パス構造の変更やミドルウェアによるリライトがあった場合にサイレントに壊れる。フレームワークが提供するパラメータ抽出機構を使うべき。現在の `withRouteHandler` ラッパーが Next.js の `context.params` を透過させていないことが根本原因。

**修正案**: `withRouteHandler` の `RouteHandler` 型に `params` を追加し、Next.js から受け取った `params` をそのまま透過させる。

```typescript
// with-route-handler.ts
export type RouteContext = { request_id: string; params: Record<string, string> };

// route.ts
async function getChartHandler(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const symbol = ctx.params.symbol;  // pathname パースではなく params から取得
  ...
}
```

### 🟡 Should

#### [src/app/api/stocks/[symbol]/chart/route.ts:38,44] `period as PeriodKey` キャストが2箇所で重複

**問題**: `VALID_PERIODS.includes()` でバリデーション後に `period as PeriodKey` を2回キャストしている（38行目・44行目）。

**理由**: TypeScript の型ガードを使えばキャスト不要にでき、型安全性と可読性が向上する。

**修正案**: カスタム型ガード関数を導入する。

```typescript
function isValidPeriod(value: string): value is PeriodKey {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

// 使用箇所
if (!isValidPeriod(period)) {
  return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
}
// 以降 period は PeriodKey 型として推論される
```

#### [src/app/api/stocks/[symbol]/chart/route.ts] Zod スキーマによるバリデーション未使用

**問題**: `PATTERNS.md` ではクエリパラメータのバリデーションに Zod の利用が推奨されているが、`period` パラメータの検証が手動の `includes` チェックで行われている。

**理由**: 他の Route Handler と一貫性がなくなる。パラメータが増えた際にバリデーションロジックが散在するリスクがある。

**修正案**: Zod スキーマを定義してバリデーションする。

```typescript
const chartQuerySchema = z.object({
  period: z.enum(['6m', '1y', '2y', '10y']).default('6m'),
});
```

#### [src/components/features/stock/stock-chart-viewer.tsx:25] `formatTick` の `new Date(dateString)` にタイムゾーン依存リスク

**問題**: `new Date("YYYY-MM-DD")` は UTC として解釈されるが、`getMonth()` / `getFullYear()` はローカルタイムゾーンで評価される。UTC-N のタイムゾーンでは日付が1日ずれ、月表示が不正になる可能性がある。

**理由**: 現在は日本国内利用が前提のため実害は低いが、将来の多地域展開で問題になる。

**修正案**: 文字列パースで年月を取得する。

```typescript
function formatTick(date: string, period: PeriodKey): string {
  const [yyyy, mm] = date.split('-');
  if (period === '10y') return yyyy;
  return `${yyyy}/${mm}`;
}
```

### 🟢 Nice to have

#### `PeriodKey` 型が2箇所で重複定義

**問題**: `PeriodKey` 型が `route.ts` と `stock-chart-viewer.tsx` の両方で独立に定義されている。

**理由**: 型が乖離すると BFF とフロントエンドでバリデーションと表示が不整合になるリスクがある。

**修正案**: `src/types/stock.ts` に `PeriodKey` を定義して共有する。ただし、BFF 側はサーバー専用コードなのでフロントエンドとの直接 import は問題ない（型のみの import は境界違反にならない）。

#### [src/app/api/stocks/[symbol]/chart/route.test.ts:35-69] `withRouteHandler` のモックが簡略化されている

**問題**: テスト内の `withRouteHandler` モックは本物のラッパーのログ出力・duration 計測を再現していない。ラッパーのリグレッションをこのテストでは検出できない。

**理由**: Route Handler の単体テストとしてはビジネスロジックのテストに集中するのが適切であり、ラッパー自体は別途テストすべき。現状は許容範囲だが、ラッパーの統合テストが存在しない場合はカバレッジの穴になる。

**修正案**: `withRouteHandler` 自体のユニットテストを別途作成する（本 Issue のスコープ外）。

## 良かった点

- **BFF の並列取得**: `getStockChart` で Service A・B を `Promise.all` で並列取得しており、パフォーマンスを意識した実装。
- **エラーハンドリングの階層化**: `withRouteHandler` ラッパーで `UnauthorizedError` / 予期しないエラーを統一処理し、個別ハンドラでは `DownstreamError` のみをハンドリング。責務が適切に分離されている。
- **TanStack Query のキー設計**: `stockChartKeys` でキーファクトリを使っており、キャッシュ無効化が容易な設計。
- **Server Component / Client Component の使い分け**: `StockChartPage` は Server Component、`StockChartViewer` は `'use client'` と正しく分離。`StockCard` も Server Component のまま維持されている。
- **テストカバレッジ**: 正常系・異常系・境界ケース（片方のサービスのみのデータポイント、日付ソート）を網羅しており、十分なカバレッジ。
- **Downstream クライアントの URI エンコーディング**: `encodeURIComponent` が適切に使われている。
- **命名規則の遵守**: ファイル名（kebab-case）、コンポーネント（PascalCase）、フック（`use-` prefix）が `NAMING.md` に準拠。
