// Sets Sentry user, session, and request context on every API request
import * as Sentry from '@sentry/nextjs';

interface SentryRequestContextOptions {
  userId?: string | undefined;
  sessionId?: string | undefined;
  requestId: string;
  route: string;
}

export function setSentryRequestContext(options: SentryRequestContextOptions): void {
  const { userId, sessionId, requestId, route } = options;

  if (userId) {
    Sentry.setUser({ id: userId });
  }

  Sentry.setTag('requestId', requestId);
  Sentry.setTag('route', route);

  if (sessionId) {
    Sentry.setContext('session', { sessionId });
  }
}
