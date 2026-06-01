// Sets Sentry user, session, and request context on every API request
import * as Sentry from '@sentry/nextjs';

interface SentryRequestContextOptions {
  userId?: string | undefined;
  sessionId?: string | undefined;
  requestId: string;
  route: string;
}

/**
 * Attaches user, request, route, and session identifiers to the current Sentry scope.
 *
 * Should be called once per request, inside the `withObservability` wrapper, after
 * authentication resolves. Values appear in Sentry issues under Tags and Context.
 *
 * @param options - Identifiers to attach; `userId` and `sessionId` are optional for public routes.
 */
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
