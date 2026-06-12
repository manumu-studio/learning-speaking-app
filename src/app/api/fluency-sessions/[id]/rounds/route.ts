// POST create a round within a 4-3-2 timed fluency session
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { z } from 'zod';
import type pino from 'pino';
import {
  ROUND_TARGET_MINUTES,
  fetchFluencySession,
  validateRoundCreation,
  completeFluencySession,
} from './roundsHelpers';

// ── Schemas ─────────────────────────────────────────────────────────

const CreateRoundSchema = z.object({
  roundNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  speakingSessionId: z.string().min(1, 'speakingSessionId is required'),
});

// ── POST /api/fluency-sessions/[id]/rounds ──────────────────────────

async function postHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id: fluencySessionId } = await routeCtx.params;

  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  // Validate request body
  const body: unknown = await req.json();
  const parsed = CreateRoundSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return errorResponse(firstError, 'VALIDATION_ERROR', 400);
  }

  const { roundNumber, speakingSessionId } = parsed.data;

  // Verify fluency session belongs to user
  const fluencySession = await fetchFluencySession(fluencySessionId, user.id);
  if (!fluencySession) {
    return errorResponse('Fluency session not found', 'SESSION_NOT_FOUND', 404);
  }

  const validationError = validateRoundCreation(fluencySession, roundNumber);
  if (validationError) return validationError;

  // Verify speaking session belongs to user
  const speakingSession = await prisma.speakingSession.findFirst({
    where: { id: speakingSessionId, userId: user.id },
  });

  if (!speakingSession) {
    return errorResponse('Speaking session not found', 'SPEAKING_SESSION_NOT_FOUND', 404);
  }

  // Create the round
  const targetMinutes = ROUND_TARGET_MINUTES[roundNumber];
  const round = await prisma.timedFluencyRound.create({
    data: { fluencySessionId, roundNumber, targetMinutes, speakingSessionId },
  });

  // After Round 3: mark session completed and backfill metrics
  if (roundNumber === 3) {
    await completeFluencySession(fluencySessionId, logger);
  }

  logger.info({ fluencySessionId, roundId: round.id, roundNumber }, 'Fluency round created');

  return successResponse(
    {
      id: round.id,
      fluencySessionId: round.fluencySessionId,
      roundNumber: round.roundNumber,
      targetMinutes: round.targetMinutes,
      speakingSessionId: round.speakingSessionId,
      createdAt: round.createdAt.toISOString(),
    },
    201,
  );
}

export const POST = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => postHandler(r, obsCtx, routeCtx),
    { route: 'fluency-sessions/[id]/rounds', getSession: auth },
  )(req);
