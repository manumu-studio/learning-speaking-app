// Structured logging utility — never logs transcript content
import { env } from '@/lib/env';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  sessionId?: string | undefined;
  userId?: string | undefined;
  duration?: number | undefined;
  error?: string | undefined;
  /** WARNING: never pass PII (emails, transcripts, names) in metadata */
  metadata?: Record<string, unknown> | undefined;
}

export function log(entry: LogEntry): void {
  const timestamp = new Date().toISOString();
  const logData = {
    ...entry,
    timestamp,
    environment: env.NODE_ENV,
  };

  const method =
    entry.level === 'error'
      ? 'error'
      : entry.level === 'warn'
        ? 'warn'
        : 'info';

  console[method](JSON.stringify(logData));
}
