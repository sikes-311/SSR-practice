/**
 * ログスキーマ型定義
 * docs/LOGGING.md に基づく構造化ログの型制約
 */

export type LogStatus = 'info' | 'warn' | 'error';

/** ECS準拠の event.category（docs/LOGGING.md §8） */
export type EventCategory = 'web' | 'authentication' | 'file' | 'session';

/** 全ログ共通の必須フィールド（docs/LOGGING.md §2） */
export interface BaseLogEntry {
  service: string;
  env: string;
  version: string;
  message: string;
  status: LogStatus;
  'event.name': string;
  'event.category': EventCategory;
  request_id: string;
  'trace_id'?: string;
}

/** 任意フィールド（docs/LOGGING.md §3） */
export interface OptionalLogFields {
  'user.id'?: string;
  /** 下流サーバー発行のsessionIdをSHA-256ハッシュ化した値。生値は禁止 */
  session_id_hash?: string;
  'feature.name'?: string;
  'logger.name'?: string;
  tags?: string[];
}

/** HTTPコンテキスト（BFF）（docs/LOGGING.md §4） */
export interface HttpContext {
  'http.method'?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  'url.path'?: string;
  'http.status_code'?: number;
  duration_ms?: number;
}

/** エラーフィールド（WARN/ERROR時は必須）（docs/LOGGING.md §5） */
export interface ErrorFields {
  'error.code': string;
  'error.type': string;
  'error.message': string;
}

/** 下流呼び出しフィールド（呼び出し時は必須）（docs/LOGGING.md §6） */
export interface DownstreamFields {
  'downstream.service': string;
  'downstream.endpoint': string;
  'downstream.request_body'?: Record<string, unknown>;
  'downstream.error_body'?: string;
}

/** BFF用ログエントリ */
export type BffLogEntry = BaseLogEntry &
  OptionalLogFields &
  HttpContext & {
    error?: ErrorFields;
    downstream?: DownstreamFields;
  };

/** フロントエンド用ログエントリ */
export type FrontendLogEntry = BaseLogEntry & OptionalLogFields;
