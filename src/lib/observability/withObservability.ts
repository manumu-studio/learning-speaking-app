// Standardized API route wrapper — request ID, structured logging, Sentry context, error capture
import type pino from 'pino';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getRequestId, withRequestId } from './requestId';
import { setSentryRequestContext } from './sentryContext';

export interface ObservabilityContext {
  logger: pino.Logger;
  requestId: string;
}

interface ObservabilityOptions {
  route?: string;
  /** Optional session resolver — inject from the call site so lib stays auth-agnostic. */
  getSession?: () => Promise<{ user?: { externalId?: string | undefined } | undefined } | null | undefined>;
}

/** Route handler type accepted by both call sites: direct export and inline invocation. */
type RouteHandler = {
  (req: Request, routeCtx: { params: Promise<Record<string, string>> }): Promise<Response>;
  (req: Request): Promise<Response>;
};

/**
 * Wraps a Next.js App Router handler with full observability: request ID propagation,
 * structured Pino logging, Sentry user/request context, and unhandled error capture.
 *
 * The wrapped handler receives an `ObservabilityContext` with a child logger (pre-seeded
 * with `requestId` and `route`) and the `requestId` string. Uncaught errors are sent to
 * Sentry and converted to a generic 500 JSON response.
 *
 * Pass `getSession: auth` from call sites that have access to the auth function. Routes
 * that do not call `getSession` will still log and capture errors — Sentry user context
 * will simply be undefined.
 *
 * @param handler - The route logic receiving the request and observability context.
 * @param options - Optional `route` override and `getSession` callback for Sentry user context.
 * @returns A Next.js-compatible route handler accepting optional `params`.
 */
export function withObservability(
  handler: (req: Request, ctx: ObservabilityContext) => Promise<Response>,
  options?: ObservabilityOptions,
): RouteHandler {
  const fn: RouteHandler = async (req: Request) => {
    const requestId = getRequestId(req);
    const route = options?.route ?? new URL(req.url).pathname;
    const childLogger = logger.child({ requestId, route });

    let userId: string | undefined;
    try {
      const session = await options?.getSession?.();
      userId = session?.user?.externalId;
    } catch {
      // Unauthenticated or getSession not provided — OK for public routes
    }

    setSentryRequestContext({ userId, requestId, route });

    const start = Date.now();
    childLogger.info({ method: req.method }, 'Request started');

    try {
      const response = await withRequestId(requestId, () =>
        handler(req, { logger: childLogger, requestId }),
      );
      childLogger.info(
        { durationMs: Date.now() - start, status: response.status },
        'Request completed',
      );
      return response;
    } catch (error) {
      const durationMs = Date.now() - start;
      Sentry.captureException(error);
      childLogger.error({ err: error, durationMs }, 'Unhandled route error');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };

  return fn;
}
