# コードレビューレポート - Issue #1

レビュー日時: 2026-03-22
レビュアー: code-review-agent

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Must（リリース前に修正必須） | 0件 |
| 🟡 Should（できれば修正） | 6件 |
| 🟢 Nice to have（次回以降でOK） | 3件 |

---

## SC-1（ログイン機能）レビュー

### 🟡 Should

#### [src/lib/downstream/auth-client.ts:1] 環境変数の非null アサーション

**問題**: `process.env.DOWNSTREAM_API_URL!` で非null アサーションを使用しており、環境変数が未設定の場合に `undefined` が暗黙的に使われ、`fetch("undefined/auth/login")` のような分かりにくいランタイムエラーになる。
**理由**: 障害時の原因特定が困難になる。環境変数の欠落はシステム境界の入力であり、バリデーション対象。
**修正案**: モジュール初期化時に存在チェックを行い、未設定時は明確なエラーメッセージで早期に失敗させる。

#### [src/lib/session.ts:11] SESSION_SECRET の型アサーション

**問題**: `process.env.SESSION_SECRET as string` で型アサーションを使用しており、未設定時に `undefined` がパスワードとして渡される。
**理由**: セキュリティクリティカルな設定値であり、欠落時は即座にアプリケーションを停止すべき。
**修正案**: 起動時にバリデーションする。

#### [src/lib/downstream/auth-client.ts:34] Downstream レスポンスの型アサーション

**問題**: `return res.json() as Promise<LoginResponse>` で型アサーションを使用しており、Downstream が想定外のレスポンスを返した場合に型と実値が乖離する。
**理由**: Downstream は外部境界であり、レスポンス形式は保証されない。
**修正案**: Zod スキーマでパースする。

#### [src/app/actions/auth.ts:18-24] バリデーションロジックの冗長性

**問題**: `typeof email !== 'string'` と `!email` の2段階チェックが同一エラーメッセージで処理されており、冗長。
**理由**: 可読性の低下。
**修正案**: 条件を統合するか、Zod スキーマに置き換える。

### 🟢 Nice to have

#### [src/app/actions/auth.ts] Server Action のバリデーションに Zod 未使用

**問題**: CLAUDE.md で推奨されている Zod によるバリデーションが Server Action に適用されていない。
**理由**: 現状のシンプルなバリデーションでも機能的には問題ない。将来的に入力項目が増えた場合に検討。

#### [src/app/(auth)/login/page.tsx] React Hook Form 未使用

**問題**: CLAUDE.md のフォーム技術スタックに「React Hook Form + Zod」が記載されているが、`useActionState` による素の form 実装になっている。
**理由**: SC-1 のログインフォームは2フィールドのみでありオーバーエンジニアリング。現状維持で問題なし。

---

## SC-3（人気銘柄株価表示）レビュー

### 🟡 Should

#### [src/lib/downstream/stock-client.ts:3] 環境変数の非null アサーション

**問題**: `process.env.DOWNSTREAM_API_URL!` で非null アサーションを使用。auth-client.ts と同一の問題。
**理由**: 環境変数が未設定の場合、`fetch("undefined/stocks/popular")` のような分かりにくいランタイムエラーになる。
**修正案**: auth-client.ts と共通の環境変数バリデーションユーティリティを導入するか、各クライアントで存在チェックを行う。

```typescript
const BASE_URL = process.env.DOWNSTREAM_API_URL;
if (!BASE_URL) {
  throw new Error('DOWNSTREAM_API_URL is not set');
}
```

#### [src/lib/downstream/stock-client.ts:31] Downstream レスポンスの型アサーション

**問題**: `(await res.json()) as DownstreamPopularStocksDto` で型アサーションを使用。Downstream が想定外の構造を返した場合（例: `stocks` が配列でない、フィールドが欠落）、`.map()` 呼び出し時に `Cannot read property 'map' of undefined` のような不明瞭なエラーが発生する。
**理由**: Downstream は外部境界であり、レスポンス形式は保証されない。auth-client.ts でも同一の指摘あり。プロジェクト全体で一貫してZod による runtime validation を適用すべき。
**修正案**: Zod スキーマでパースする。

```typescript
import { z } from 'zod';

const downstreamStockSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change_percent: z.number(),
  price_date: z.string(),
});

const downstreamPopularStocksSchema = z.object({
  stocks: z.array(downstreamStockSchema),
});

// usage:
const data = downstreamPopularStocksSchema.parse(await res.json());
```

### 🟢 Nice to have

#### [src/app/(app)/page.tsx:15] catch 節でエラー情報が未使用

**問題**: `catch { hasError = true; }` でエラーオブジェクトを受け取っておらず、エラーの種類や詳細が完全に破棄されている。
**理由**: LOGGING.md §17.1 では Server Component でも下流呼び出しのログ出力が求められている。現状はログ基盤（logger）が未整備のため即時対応は不要だが、logger 整備後にはここで下流エラーをログ出力すべき。また、`DownstreamError` 以外の予期しないエラー（例: ネットワークエラー）も一律 `hasError = true` で処理されるため、デバッグ時に問題切り分けが困難になる可能性がある。
**修正案**: logger 整備後に以下のようにエラーログを追加する。

```typescript
try {
  stockData = await getPopularStocks(session.sessionId);
} catch (error) {
  // TODO: logger 整備後にログ出力を追加
  hasError = true;
}
```

---

## 良かった点

### SC-1（ログイン）
- **責務分離が明確**: `auth-client.ts`（Downstream通信）→ `auth.ts`（Server Action/ビジネスロジック）→ `page.tsx`（UI）の3層が適切に分離されている。
- **CLAUDE.md のデータ取得パターンに準拠**: ログインは Server Action パターン、認証チェックは layout.tsx での `requireSession()` と、アーキテクチャルールに正しく従っている。
- **エラーハンドリングの階層設計**: Downstream 層で `AuthenticationError` / `DownstreamError` を投げ、Server Action 層でユーザー向けメッセージに変換する設計が適切。
- **テストの品質**: AAA パターンで整理され、正常系・異常系・ローディング状態を網羅しており、可読性が高い。
- **`redirect()` が try/catch の外**: Next.js の `redirect()` は内部的にエラーをスローするため、catch に入れるとリダイレクトが動作しない。正しく try/catch の外に配置されている。

### SC-3（株価表示）
- **データ取得パターンが完全に正しい**: Server Component が `lib/downstream/stock-client.ts` を直接呼び出すパターンは、PATTERNS.md の「ページロード時の固定データ取得 → Server Component → lib/downstream/ 直接」に完全に準拠。Route Handler を経由していない。
- **Downstream DTO → レスポンス型の変換が明示的**: `stock-client.ts:33-40` で snake_case → camelCase の変換が明示的にマッピングされており、Downstream の内部構造がフロントエンドに漏洩していない。
- **StockCard の責務分離**: 表示ロジックのみに集中しており、データ取得や状態管理を含まない。Server Component として正しく `'use client'` なしで実装されている。
- **エラー時のフォールバック UI**: `page.tsx:35-38` で Downstream エラー時に `data-testid="stock-error"` 付きのエラーメッセージを表示しており、SC-6 シナリオに適切に対応。
- **テストカバレッジ**: `stock-card.test.tsx` が正の変動率・ゼロ・負の変動率を網羅。`stock-client.test.ts` が snake_case→camelCase 変換・セッションID伝搬・エラーハンドリングを検証。
- **命名規則の遵守**: ファイル名 kebab-case (`stock-card.tsx`, `stock-client.ts`)、コンポーネント PascalCase (`StockCard`)、型名 PascalCase (`StockResponse`)、全て規則通り。
- **DownstreamError クラスの設計**: `status = 502` を保持しており、上位層でHTTPレスポンスに変換しやすい設計。
