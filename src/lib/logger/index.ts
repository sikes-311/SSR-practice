import 'server-only';
import type { BaseLogEntry, LogStatus } from '@/types/log';

type LogPayload = Omit<BaseLogEntry, 'service' | 'env' | 'version' | 'status'> & {
  [key: string]: unknown;
};

function write(status: LogStatus, payload: LogPayload): void {
  const entry = {
    service: 'web-bff',
    env: process.env.NODE_ENV ?? 'development',
    version: process.env.NEXT_PUBLIC_VERSION ?? 'unknown',
    status,
    ...payload,
  };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export const logger = {
  info: (payload: LogPayload) => write('info', payload),
  warn: (payload: LogPayload) => write('warn', payload),
  error: (payload: LogPayload) => write('error', payload),
};
