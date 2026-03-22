# セキュリティレビューレポート - Issue #1

レビュー日時: 2026-03-22
レビュアー: security-review-agent
参照: OWASP Top 10 2021

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Critical（即時修正必須） | 0件 |
| 🔴 High（リリース前に修正必須） | 0件 |
| 🟡 Medium（次スプリントまでに修正） | 3件 |
| 🟢 Low（改善推奨） | 3件 |

## npm audit 結果

| パッケージ | 重要度 | 脆弱性 | 対応 |
|---|---|---|---|
| esbuild (≤0.24.2) via drizzle-kit | Moderate | 開発サーバーへの任意リクエスト送信（GHSA-67mh-4wv8-2f99） | 開発依存のみ。本番影響なし。drizzle-kit アップデート時に解消予定 |

High 以上の脆弱性: **なし**

## 指摘事項

### 🟡 Medium

#### [OWASP A03] [src/app/actions/auth.ts:15-24] 入力バリデーションが不十分

**問題**: `loginAction` は `typeof` チェックと空文字チェックのみで、Zod によるバリデーションが適用されていない。メールアドレスの形式チェック（`z.string().email()`）やパスワードの最低文字数チェックがない。CLAUDE.md のパターンでは全 Server Action に Zod バリデーションを適用する方針。

**攻撃シナリオ**: 不正な形式の入力がそのまま Downstream に送信される。Downstream 側のバリデーションに依存する形になり、防御の多層化が不十分。

**修正案**:
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

**参考**: https://owasp.org/Top10/A03_2021-Injection/

---

#### [OWASP A05] [next.config.ts] セキュリティヘッダーが未設定

**問題**: `next.config.ts` が空の設定で、セキュリティヘッダー（`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` 等）が一切設定されていない。

**攻撃シナリオ**: クリックジャッキング（iframe 埋め込み）、MIME スニッフィングによるコンテンツ誤解釈のリスク。

**修正案**:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

**参考**: https://owasp.org/Top10/A05_2021-Security_Misconfiguration/

---

#### [OWASP A04] [src/app/actions/auth.ts:36] ログ出力にエラーオブジェクト全体を含む

**問題**: `console.error('Login error:', e)` がエラーオブジェクト全体を出力している。Downstream からのレスポンスにセンシティブ情報（内部 URL、スタックトレース等）が含まれる場合、ログに漏洩する。

**攻撃シナリオ**: ログ収集ツール経由で内部構成情報が漏洩する可能性。

**修正案**:
```typescript
console.error('Login error:', e instanceof Error ? e.message : 'Unknown error');
```

**参考**: https://owasp.org/Top10/A04_2021-Insecure_Design/

---

### 🟢 Low

#### [OWASP A04] ブルートフォース対策なし

**問題**: ログインエンドポイントにレート制限がない。連続したログイン試行をサーバー側で制限する仕組みがない。

**攻撃シナリオ**: 自動化ツールによる大量ログイン試行（クレデンシャルスタッフィング）。

**修正案**: Next.js middleware またはリバースプロキシ（Azure Front Door 等）でレート制限を導入。今回スコープ外であれば、将来タスクとして記録を推奨。

---

#### [OWASP A07] セッション固定化対策の明示的実装なし

**問題**: ログイン成功時に既存セッションを明示的に破棄してから新しい sessionId をセットする処理がない。iron-session は `session.save()` 時に新しい Cookie を発行するため実質的なリスクは低いが、明示的な `session.destroy()` → 再取得 → `session.save()` のパターンがベストプラクティス。

**修正案**:
```typescript
const session = await getSession();
session.destroy(); // 既存セッションを破棄
const freshSession = await getSession();
freshSession.sessionId = sessionId;
await freshSession.save();
```

---

#### [OWASP A01] middleware.ts が未実装

**問題**: `src/middleware.ts` が存在しない。現在は `(app)/layout.tsx` の `requireSession()` でセッションチェックしているが、middleware による一元的なアクセス制御がない。`(app)/` 配下に新しいページを追加した際にセッションチェック漏れが発生するリスクがある。

**修正案**: 今回の SC-1 スコープでは layout.tsx のチェックで十分だが、Route Handler が増える Phase 以降で middleware.ts の導入を推奨。

## 確認済み（問題なし）の項目

| OWASP | 項目 | 結果 |
|---|---|---|
| A01 | `(app)/layout.tsx` で `requireSession()` が呼ばれている | ✅ OK |
| A02 | `SESSION_SECRET` が `process.env` から取得されている（ハードコードなし） | ✅ OK |
| A02 | `.env*` が `.gitignore` に含まれている | ✅ OK |
| A02 | iron-session Cookie に `httpOnly: true` が設定されている | ✅ OK |
| A02 | iron-session Cookie に `secure: true`（本番）が設定されている | ✅ OK |
| A02 | `sameSite: 'lax'` が設定されている（CSRF 基本対策） | ✅ OK |
| A03 | `dangerouslySetInnerHTML` の使用なし | ✅ OK |
| A04 | エラーレスポンスにスタックトレースや内部情報を含まない（ユーザー向けメッセージのみ） | ✅ OK |
| A07 | `cookieName` がアプリ固有の名前 `'app_session'` になっている | ✅ OK |
| A07 | セッション有効期限が 24 時間（妥当） | ✅ OK |
| A07 | ログイン失敗時のエラーメッセージが曖昧（ユーザー存在確認不可） | ✅ OK |
| A08 | Server Action でサーバー側バリデーションを実施（クライアントのみに依存していない） | ✅ OK |
| A10 | Downstream URL が `process.env.DOWNSTREAM_API_URL` で固定されている | ✅ OK |
| A10 | ユーザー入力から URL が動的生成されていない | ✅ OK |
| CSRF | Server Action 使用により Next.js の CSRF トークン保護が適用される | ✅ OK |
| XSS | React の自動エスケープにより出力エスケープが適用されている | ✅ OK |
