# 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| ファイル | kebab-case | `user-profile.tsx` |
| コンポーネント | PascalCase export | `export function UserProfile()` |
| フック | `use-` prefix（ファイル）/ `use` prefix（関数） | `use-users.ts` / `useUsers()` |
| Route Handler | `route.ts` 固定 | `src/app/api/users/route.ts` |
| Server Action | `{feature}.ts` | `src/app/actions/user.ts` |
| Drizzle スキーマ | 機能名単数形 | `src/lib/db/schema/user.ts` |
| Downstream クライアント | `{feature}-client.ts` | `src/lib/downstream/user-client.ts` |
| 型定義 | `{feature}.ts` | `src/types/user.ts` |
