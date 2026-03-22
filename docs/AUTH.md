# 認証フロー

## フロー

```
1. ユーザーがログインフォームを送信（Server Action）
2. Server Action が lib/downstream/auth-client.ts を直接呼ぶ
3. 下流サービスが sessionId を返す
4. iron-session が sessionId を暗号化して Cookie にセット
5. 以降のリクエストは requireSession() で Cookie を検証
```

---

## セッションオブジェクト

`src/lib/session.ts`:

```typescript
interface SessionData {
  sessionId: string;
  permissions?: string[]; // 将来的に権限情報を持たせる可能性あり
}
```

---

## requireSession()

- 認証済みページ・Route Handler・Server Action で必ず呼ぶ
- 未認証の場合 `UnauthorizedError` をスローする
- Route Handler では `catch` して 401 を返す
- Server Action では `catch` して `/login` にリダイレクトする

---

## セキュリティ注意事項

- sessionId の生値はログに出力禁止（`docs/LOGGING.md` §14 参照）
- ログに記録する場合は SHA-256 ハッシュ化した `session_id_hash` を使用する
