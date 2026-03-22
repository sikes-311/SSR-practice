# ログ・エラー設計仕様 (Next.js BFF + フロントエンド + Datadog)

---

## 0. 目的

本ドキュメントは以下のログ設計ルールを定義する。

対象:

- Next.js Route Handler（BFF）
- Next.js Server Action（BFF）
- ブラウザ（フロントエンド）
- Datadogでのログ収集・分析

目的:

- 構造化ログの統一
- フロント〜BFF〜下流の横断追跡
- 運用（調査・アラート・監査）の最適化

---

## 1. 基本原則

### 1.1 ログは構造化イベントである

- ログは必ずJSON形式で出力する
- 文字列ログは禁止（補助用途を除く）
- messageは補助情報、フィールドが主

---

### 1.2 フロントとBFFでスキーマを統一する

- フィールド名は統一すること
- 同じ意味に異なるキーを使わない

---

### 1.3 1イベント = 1ログ

- 同一イベントを複数ログに分割しない
- 例外: リクエスト開始 / 終了

---

### 1.4 エラーは機械判定可能であること

- 必ず error.code を付与する
- messageでの判定は禁止

---

## 2. 必須フィールド（全ログ共通）

```json
{
  "service": "string",
  "env": "string",
  "version": "string（gitコミットSHA短縮形。ビルド時に NEXT_PUBLIC_VERSION として注入）",
  "message": "string",
  "status": "info|warn|error",
  "event.name": "string",
  "event.category": "ECS準拠の値（§8参照）",
  "request_id": "string",
  "trace_id": "string（任意だが推奨）"
}
```

---

## 3. 任意フィールド（推奨）

```json
{
  "user.id": "string",
  "session_id_hash": "string（下流サーバー発行のsessionIdをSHA-256ハッシュ化した値。生値は禁止）",
  "feature.name": "string",
  "logger.name": "string",
  "tags": ["string"]
}
```

---

## 4. HTTPコンテキスト（BFF）

```json
{
  "http.method": "GET|POST|PUT|DELETE",
  "url.path": "string",
  "http.status_code": 200,
  "duration_ms": 123
}
```

---

## 5. エラーフィールド（WARN/ERROR時は必須）

```json
{
  "error.code": "string",
  "error.type": "string",
  "error.message": "string"
}
```

### 5.1 ルール

- error.code は安定した値とする
- error.message は変更可能
- error.type は例外クラスに対応させる

---

## 6. 下流呼び出しフィールド

下流呼び出し時は以下をすべて必須とする。

```json
{
  "downstream.service": "string",
  "downstream.endpoint": "string",
  "http.status_code": 0
}
```

以下は任意フィールド:

```json
{
  "downstream.request_body": "object（機密フィールドをマスク処理した上で出力。パスワード・トークン等は必ず除去）",
  "downstream.error_body": "string（エラー時のみ。長大な場合はtruncate推奨）"
}
```

---

## 7. event.name 命名ルール

### 7.1 形式

snake_case

---

### 7.2 例

- http_request_started
- http_request_completed
- login_attempted
- login_succeeded
- login_failed
- file_downloaded
- file_uploaded
- downstream_call_failed
- ui_render_failed

---

## 8. event.category

ECS（Elastic Common Schema）の値を使用する。このプロジェクトで使用するカテゴリは以下に限定する。

| category       | 説明                           | 例                             |
| -------------- | ------------------------------ | ------------------------------ |
| `web`          | HTTPリクエスト処理             | リクエスト開始・終了、API呼び出し |
| `authentication` | 認証・認可に関する操作       | ログイン試行・成功・失敗       |
| `file`         | ファイル操作                   | ファイルDL・UL                 |
| `session`      | セッション管理                 | セッション作成・失効           |

> セキュリティ脅威の検知（ブルートフォース攻撃等）はDatadog Cloud SIEMの検知ルールが`authentication`ログを分析して判定する。アプリ側でセキュリティカテゴリを付与しない。

---

## 9. ログレベル

### INFO

- 正常処理
- 重要な業務イベント

例:

- リクエスト成功
- ログイン成功
- 注文作成

---

### WARN

- 想定内エラー
- 回復可能な異常

例:

- バリデーションエラー
- 認証失敗
- 下流4xx

---

### ERROR

- 想定外エラー
- 回復不能

例:

- 未処理例外
- タイムアウト
- 下流5xx

---

### DEBUG

- 本番では送信しない（またはサンプリング）
- 開発用途のみ

---

## 10. BFF境界ルール（Route Handler + Server Action）

Route HandlerとServer Actionはどちらもログ境界として同等に扱う。

### 10.1 必ずログ出力するもの

- リクエスト開始（Route Handlerのみ）
- リクエスト終了（Route Handlerのみ）
- 下流呼び出し
- 例外
- 監査イベント

> Server Actionはリクエスト開始・終了ログは不要。HTTPの概念に直接対応しないため。

---

### 10.2 出力禁止

- 生リクエストボディ（マスクなし）
- パスワード
- トークン
- セッションID（生値）

---

### 10.3 リクエストライフサイクル（Route Handler）

#### 開始

```json
{
  "event.name": "http_request_started",
  "event.category": "web"
}
```

#### 終了

```json
{
  "event.name": "http_request_completed",
  "event.category": "web",
  "http.status_code": 200,
  "duration_ms": 120
}
```

---

### 10.4 例外処理

- ログは境界（Route Handler / Server Action）で1回のみ
- 下位層（lib/downstream/, lib/db/）ではログ出力しない

---

### 10.5 Server Action固有のルール

- リクエスト開始・終了ログは不要
- 予期しない例外は境界でERRORログを出力する
- 監査イベント（ログイン試行等）は必ずログ出力する
- request_idはServer Action呼び出し時にサーバー側で生成する

---

### 10.6 共通化実装

- Route Handler用・Server Action用それぞれにラッパー関数を用意する
- ラッパー関数が開始・終了・例外ログを自動出力する
- 個別のRoute Handler・Server ActionでのconsoleおよびloggerのRAW呼び出しは禁止

---

### 10.7 下流呼び出し例

```json
{
  "event.name": "downstream_call_failed",
  "event.category": "web",
  "status": "error",
  "downstream.service": "payment-api",
  "downstream.endpoint": "/payments/charge",
  "http.status_code": 504,
  "error.code": "BFF_DOWNSTREAM_TIMEOUT",
  "error.type": "TimeoutError",
  "downstream.error_body": "upstream connect error or disconnect/reset before headers. reset reason: connection timeout"
}
```

---

## 11. フロントエンドログルール

### 11.1 送信手段

Datadog RUM SDKを使用する。

- `datadogLogs.logger.error()` 等でJSON構造化ログを出力する
- RUM SDKが `trace_id`・`session` を自動付与するため、アプリ側での付与は不要
- `allowedTracingUrls` に `/api/` を設定し、BFF側APMとのトレース相関を有効にする

---

### 11.2 出力対象

- UI破綻エラー
- 重要操作失敗
- UXに影響するAPI失敗

---

### 11.3 出力禁止

- consoleデバッグ
- 高頻度イベント
- フォーム生データ

---

### 11.4 例

```json
{
  "service": "web-frontend",
  "event.name": "checkout_submit_failed",
  "event.category": "web",
  "status": "error",
  "feature.name": "checkout",
  "error.code": "CHECKOUT_API_FAILED"
}
```

---

## 12. 相関ルール

### 12.1 request_id

- Route Handler・Server Actionがリクエスト受信時にサーバー側で生成する
- 全ログで共通使用する
- 人間がDatadog上でクエリする際の補助IDとして機能する

> フロントからのヘッダ伝搬（x-request-id）は、Route Handlerについては任意で対応可。Server ActionはHTTPヘッダを任意付与できないためサーバー生成に統一する。

---

### 12.2 trace_id

- Datadog RUM SDKおよびAPMが自動生成・伝搬する
- `allowedTracingUrls` 設定によりフロント↔BFF間のトレースが自動相関される
- アプリコードでの手動設定は不要

---

### 12.3 役割

| フィールド | 用途             | 生成者        |
| ---------- | ---------------- | ------------- |
| request_id | 人間向け補助追跡 | BFFサーバー   |
| trace_id   | システム自動相関 | Datadog RUM/APM |

---

## 13. エラーコード設計

### 13.1 ルール

- UPPER_SNAKE_CASE
- ドメイン + 意味
- 安定性を保つ

---

### 13.2 例

- AUTH_INVALID_CREDENTIALS
- AUTH_SESSION_EXPIRED
- BFF_DOWNSTREAM_TIMEOUT
- ORDER_VALIDATION_FAILED
- UNEXPECTED_INTERNAL_ERROR

---

### 13.3 アンチパターン

- ERROR_001
- HTTPステータス依存
- message依存

---

## 14. セキュリティ

### 出力禁止

- パスワード
- トークン
- セッションID生値（`session_id_hash` としてSHA-256ハッシュ化した値のみ許可）
- クレジットカード
- 個人情報（必要以上）

---

### 許可

- user.id
- ハッシュ値
- マスク済みデータ

---

## 15. Datadog前提ルール

### BFF（サーバーサイド）必須

- service
- env
- version（gitコミットSHA短縮形。`NEXT_PUBLIC_VERSION` として注入）
- JSONログ出力

---

### フロントエンド

- Datadog RUM SDKを使用する
- `applicationId`・`clientToken` を環境変数で管理する
- `allowedTracingUrls: [/\/api\//]` を設定してBFF APMと相関する

---

### 推奨

- Datadog標準属性との整合
  - status
  - service
  - trace_id

---

## 16. 実装制約（AI用）

### MUST

- 必須フィールドを必ず含める
- event.name を必ず指定
- status を必ず指定
- フィールド名を統一する
- BFF境界（Route Handler・Server Action）ではラッパー関数経由でログを出力する
- session_id_hash はSHA-256ハッシュ化した値のみ使用する

---

### MUST NOT

- console.log直書き
- 非構造化ログ
- 独自キー乱立
- セッションID生値のログ出力
- ラッパー関数を経由しないRAWなロガー呼び出し（BFF境界内）

---

## 17. Server Componentのログルール

Server ComponentはHTTPリクエストの境界ではなくレンダリングの一部であるため、BFF境界ルールとは区別する。

### 17.1 ログ出力対象

- 下流呼び出し（§6のフィールドを使用）

### 17.2 ログ出力不要

- リクエスト開始・終了（Next.jsのレンダリングサイクルに内包されるため）

### 17.3 例外処理

- Server ComponentではログしないでNext.jsのError Boundaryに委ねる

---

## 18. 最小例（BFF）

```json
{
  "service": "web-bff",
  "env": "prod",
  "version": "fc880e6",
  "message": "下流APIタイムアウト",
  "status": "error",
  "event.name": "downstream_call_failed",
  "event.category": "web",
  "request_id": "req-123",
  "trace_id": "trace-xyz",
  "user.id": "u-001",
  "http.method": "POST",
  "url.path": "/api/order",
  "http.status_code": 504,
  "duration_ms": 3000,
  "downstream.service": "order-api",
  "downstream.endpoint": "/orders",
  "error.code": "BFF_DOWNSTREAM_TIMEOUT",
  "error.type": "TimeoutError",
  "error.message": "timeout"
}
```

---

## 19. 最小例（フロント）

```json
{
  "service": "web-frontend",
  "env": "prod",
  "version": "fc880e6",
  "message": "注文送信失敗",
  "status": "error",
  "event.name": "checkout_submit_failed",
  "event.category": "web",
  "request_id": "req-123",
  "session_id_hash": "a3f8c1d2e4b5...",
  "feature.name": "checkout",
  "error.code": "CHECKOUT_API_FAILED",
  "error.type": "ApiError"
}
```
