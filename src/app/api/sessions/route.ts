// Session creation (POST) and listing (GET) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { successResponse, errorResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { mapSessionItem } from './mapSessionItem';
import { SessionListQuerySchema } from './sessionSchemas';
import { handleChunkedSession, handleFormDataSession } from './sessionHandlers';

function getDateCutoff(filter: 'all' | '7d' | '30d'): Date | null {
  if (filter === 'all') return null;
  const days = filter === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function buildCursorWhere(cursor: string | undefined, cursorId: string | undefined) {
  if (cursor === undefined || cursorId === undefined) return {};
  return {
    OR: [
      { createdAt: { lt: new Date(cursor) } },
      { createdAt: new Date(cursor), id: { lt: cursorId } },
    ],
  };
}

type SessionWhereClause = {
  userId: string;
  createdAt?: { gte: Date };
  isOnboarding?: boolean;
  OR?: Array<{ createdAt: { lt: Date } } | { createdAt: Date; id: { lt: string } }>;
};

async function fetchPagedSessions(where: SessionWhereClause, userId: string, limit: number) {
  const rows = await prisma.speakingSession.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true, status: true, intentLabel: true, topic: true,
      durationSecs: true, summary: true, createdAt: true,
      metrics: { select: { key: true, score: true } },
    },
  });
  const hasMore = rows.length > limit;
  const pageItems = hasMore ? rows.slice(0, limit) : rows;
  const withWorkout = await Promise.all(
    pageItems.map(async (s) => {
      const workoutNumber = await prisma.speakingSession.count({
        where: { userId, createdAt: { lte: s.createdAt }, isOnboarding: false },
      });
      return { ...s, workoutNumber };
    }),
  );
  return { items: withWorkout, hasMore };
}

/**
 * POST /api/sessions
 * Create new speaking session and upload audio to R2
 */
async function postHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
) {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }
  if (!validateOrigin(req)) {
    return csrfForbiddenResponse();
  }
  const user = await findOrCreateUser(session.user.externalId, {
    email: session.user.email ?? undefined,
    displayName: session.user.name ?? undefined,
  });
  const consented = await hasConsent(user.id, 'AUDIO_STORAGE');
  if (!consented) {
    return errorResponse('Recording consent required', 'CONSENT_REQUIRED', 403);
  }
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return handleChunkedSession(req, user.id);
  }
  return handleFormDataSession(req, user.id, logger);
}

export const POST = withObservability(postHandler, { route: 'sessions' });

/**
 * GET /api/sessions
 * List user's sessions with cursor-based pagination
 */
async function getHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
) {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }
  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });
  if (!user) {
    return successResponse(
      { sessions: [], nextCursor: null, nextCursorId: null, total: 0 },
      200,
      { 'Cache-Control': 'private, no-store' },
    );
  }
  const url = new URL(req.url);
  const queryResult = SessionListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!queryResult.success) {
    return errorResponse('Invalid query parameters', 'VALIDATION_ERROR', 400);
  }
  const { cursor, cursorId, limit, dateFilter, isOnboarding: isOnboardingParam } = queryResult.data;
  const excludeOnboarding = isOnboardingParam === 'false';
  const cutoff = getDateCutoff(dateFilter);
  const baseWhere: SessionWhereClause = {
    userId: user.id,
    ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
    ...(excludeOnboarding ? { isOnboarding: false } : {}),
  };
  const where: SessionWhereClause = { ...baseWhere, ...buildCursorWhere(cursor, cursorId) };
  const { items: rawItems, hasMore } = await fetchPagedSessions(where, user.id, limit);
  const items = rawItems.map(mapSessionItem);
  const lastItem = hasMore ? items[items.length - 1] : undefined;
  const nextCursor = lastItem?.createdAt ?? null;
  const nextCursorId = lastItem?.id ?? null;
  const total = await prisma.speakingSession.count({ where: baseWhere });
  logger.info({ count: items.length, total }, 'Sessions listed');
  return successResponse(
    { sessions: items, nextCursor, nextCursorId, total },
    200,
    { 'Cache-Control': 'private, no-store' },
  );
}

export const GET = withObservability(getHandler, { route: 'sessions' });
