// Structured logger using Pino — JSON in production, pretty-print in development
import pino from 'pino';

// Reads LOG_LEVEL from process.env directly (not lib/env.ts) to avoid circular import: env → logger → env
const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});
