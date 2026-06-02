// POST create + GET list for 4-3-2 timed fluency sessions
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { findPromptById } from '@/lib/prompts/promptLibrary';
import { z } from 'zod';
import type pino from 'pino';

// ── Schemas ─────────────────────────────────────────────────────────

const CreateFluencySessionSchema = z.object({
  promptId: z.string().min(1, 'promptId is required'),
});

const FluencySessionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().optional(),
});

// ── POST /api/fluency-sessions ──────────────────────────────────────

async function postHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  const body: unknown = await req.json();
  const parsed = CreateFluencySessionSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return errorResponse(firstError, 'VALIDATION_ERROR', 400);
  }

  const { promptId } = parsed.data;
  const prompt = findPromptById(promptId);
  if (!prompt) {
    return errorResponse('Prompt not found', 'PROMPT_NOT_FOUND', 404);
  }

  const session = await prisma.timedFluencySession.create({
    data: {
      userId: user.id,
      promptId,
    },
  });

  logger.info({ fluencySessionId: session.id, promptId }, 'Timed fluency session created');

  return successResponse(
    {
      id: session.id,
      promptId: session.promptId,
      promptTitle: prompt.title,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
    },
    201,
  );
}

export const POST = withObservability(postHandler, { route: 'fluency-sessions' });

// ── GET /api/fluency-sessions ───────────────────────────────────────

async function getHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await prisma.user.findUnique({
    where: { externalId: authSession.user.externalId },
  });

  if (!user) {
    return successResponse({ sessions: [], nextCursor: null });
  }

  const url = new URL(req.url);
  const queryResult = FluencySessionListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!queryResult.success) {
    return errorResponse('Invalid query parameters', 'VALIDATION_ERROR', 400);
  }

  const { limit, cursor } = queryResult.data;

  const sessions = await prisma.timedFluencySession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { rounds: true } },
    },
  });

  const hasMore = sessions.length > limit;
  const pageItems = hasMore ? sessions.slice(0, limit) : sessions;

  const items = pageItems.map((s) => {
    const prompt = findPromptById(s.promptId);
    return {
      id: s.id,
      promptId: s.promptId,
      promptTitle: prompt?.title ?? null,
      status: s.status,
      roundCount: s._count.rounds,
      createdAt: s.createdAt.toISOString(),
    };
  });

  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  logger.info({ count: items.length }, 'Fluency sessions listed');

  return successResponse({ sessions: items, nextCursor });
}

export const GET = withObservability(getHandler, { route: 'fluency-sessions' });
