# コードレビューレポート - Issue #1（SC-1: ログイン機能）

レビュー日時: 2026-03-22
レビュアー: code-review-agent

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Must（リリース前に修正必須） | 0件 |
| 🟡 Should（できれば修正） | 4件 |
| 🟢 Nice to have（次回以降でOK） | 2件 |

## 指摘事項

### 🔴 Must

なし

### 🟡 Should

#### [src/lib/downstream/auth-client.ts:1] 環境変数の非null アサーション

**問題**: `process.env.DOWNSTREAM_API_URL!` で非null アサーションを使用しており、環境変数が未設定の場合に `undefined` が暗黙的に使われ、`fetch("undefined/auth/login")` のような分かりにくいランタイムエラーになる。
**理由**: 障害時の原因特定が困難になる。環境変数の欠落はシステム境界の入力であり、バリデーション対象。
**修正案**: モジュール初期化時に存在チェックを行い、未設定時は明確なエラーメッセージで早期に失敗させる。

```typescript
const BASE_URL = process.env.DOWNSTREAM_API_URL;
if (!BASE_URL) {
  throw new Error('DOWNSTREAM_API_URL is not set');
}
```

#### [src/lib/session.ts:11] SESSION_SECRET の型アサーション

**問題**: `process.env.SESSION_SECRET as string` で型アサーションを使用しており、未設定時に `undefined` がパスワードとして渡される。iron-session が弱い暗号化キーで動作する可能性がある。
**理由**: セキュリティクリティカルな設定値であり、欠落時は即座にアプリケーションを停止すべき。`as string` は TypeScript の型チェックを無効化するだけで、ランタイム保護にならない。
**修正案**: `auth-client.ts` と同様、起動時にバリデーションする。

```typescript
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters');
}
```

#### [src/lib/downstream/auth-client.ts:34] Downstream レスポンスの型アサーション

**問題**: `return res.json() as Promise<LoginResponse>` で型アサーションを使用しており、Downstream が想定外のレスポンスを返した場合に型と実値が乖離する。
**理由**: Downstream は外部境界であり、レスポンス形式は保証されない。Zod での runtime validation が CLAUDE.md のバリデーション方針と整合する。
**修正案**: Zod スキーマでパースする。

```typescript
import { z } from 'zod';
const loginResponseSchema = z.object({ sessionId: z.string() });

// ...
return loginResponseSchema.parse(await res.json());
```

#### [src/app/actions/auth.ts:18-24] バリデーションロジックの冗長性

**問題**: `typeof email !== 'string'`（18行目）と `!email`（23行目）の2段階チェックが同一エラーメッセージで処理されており、冗長。`formData.get()` の戻り値は `string | File | null` なので、`typeof !== 'string'` で null と File を排除し、`!email` で空文字を排除しているが、1つの条件に統合できる。
**理由**: 可読性の低下。読み手が2つの条件の意図の違いを推測する必要がある。
**修正案**: 条件を統合するか、Zod スキーマに置き換える。

```typescript
const email = formData.get('email');
const password = formData.get('password');
if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
  return { error: 'メールアドレスとパスワードを入力してください。' };
}
```

### 🟢 Nice to have

#### [src/app/actions/auth.ts] Server Action のバリデーションに Zod 未使用

**問題**: CLAUDE.md で推奨されている Zod によるバリデーションが Server Action に適用されていない。手動の `typeof` チェックで代替している。
**理由**: Route Handler には「Zod スキーマによるバリデーション」が必須とされているが、Server Action でも同じ方針を採用すると一貫性が向上する。現状のシンプルなバリデーションでも機能的には問題ない。
**修正案**: 将来的に入力項目が増えた場合は Zod スキーマへの移行を検討。

#### [src/app/(auth)/login/page.tsx] React Hook Form 未使用

**問題**: CLAUDE.md のフォーム技術スタックに「React Hook Form + Zod」が記載されているが、`useActionState` による素の form 実装になっている。
**理由**: SC-1 のログインフォームはメール・パスワードの2フィールドのみであり、`useActionState` パターンはシンプルかつ適切。React Hook Form の導入はオーバーエンジニアリング。フィールド数が増える場合に検討すればよい。
**修正案**: 現状維持で問題なし。フォームが複雑化する場合に React Hook Form への移行を検討。

## 良かった点

- **責務分離が明確**: `auth-client.ts`（Downstream通信）→ `auth.ts`（Server Action/ビジネスロジック）→ `page.tsx`（UI）の3層が適切に分離されている。
- **CLAUDE.md のデータ取得パターンに準拠**: ログインは Server Action パターン、認証チェックは layout.tsx での `requireSession()` と、アーキテクチャルールに正しく従っている。
- **エラーハンドリングの階層設計**: Downstream 層で `AuthenticationError` / `DownstreamError` を投げ、Server Action 層でユーザー向けメッセージに変換する設計が適切。
- **テストの品質**: `page.test.tsx` は AAA パターンで整理され、正常系・異常系・ローディング状態を網羅しており、可読性が高い。
- **`redirect()` が try/catch の外**: Next.js の `redirect()` は内部的にエラーをスローするため、catch に入れるとリダイレクトが動作しない。正しく try/catch の外に配置されている。
- **命名規則の遵守**: ファイル名は kebab-case、コンポーネントは PascalCase、Downstream クライアントは `{feature}-client.ts` と、全て規則通り。
