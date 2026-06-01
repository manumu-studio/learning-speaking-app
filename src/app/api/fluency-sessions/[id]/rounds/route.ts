// POST create a round within a 4-3-2 timed fluency session
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { z } from 'zod';
import type pino from 'pino';

// ── Schemas ─────────────────────────────────────────────────────────

const CreateRoundSchema = z.object({
  roundNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  speakingSessionId: z.string().min(1, 'speakingSessionId is required'),
});

/** Maps round number to target duration in minutes: 1→4, 2→3, 3→2. */
const ROUND_TARGET_MINUTES: Record<1 | 2 | 3, number> = {
  1: 4,
  2: 3,
  3: 2,
};

// ── Helpers ─────────────────────────────────────────────────────────

/** Backfills speechRateWpm and fillerCount for all rounds in a completed session. */
async function backfillMetrics(fluencySessionId: string, logger: pino.Logger): Promise<void> {
  const rounds = await prisma.timedFluencyRound.findMany({
    where: { fluencySessionId },
    select: { id: true, speakingSessionId: true },
  });

  for (const round of rounds) {
    if (!round.speakingSessionId) continue;

    const [rateSnapshot, fillerInsights] = await Promise.all([
      prisma.metricSnapshot.findFirst({
        where: {
          sessionId: round.speakingSessionId,
          key: 'speakingRate',
        },
        select: { score: true },
      }),
      prisma.insight.count({
        where: {
          sessionId: round.speakingSessionId,
          category: 'fillerUsage',
        },
      }),
    ]);

    await prisma.timedFluencyRound.update({
      where: { id: round.id },
      data: {
        speechRateWpm: rateSnapshot?.score ?? null,
        fillerCount: fillerInsights,
        completedAt: new Date(),
      },
    });
  }

  logger.info({ fluencySessionId }, 'Backfilled metrics for all rounds');
}

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
  const fluencySession = await prisma.timedFluencySession.findFirst({
    where: { id: fluencySessionId, userId: user.id },
    include: {
      rounds: { select: { roundNumber: true }, orderBy: { roundNumber: 'asc' } },
    },
  });

  if (!fluencySession) {
    return errorResponse('Fluency session not found', 'SESSION_NOT_FOUND', 404);
  }

  if (fluencySession.status === 'COMPLETED') {
    return errorResponse('Session is already completed', 'SESSION_COMPLETED', 409);
  }

  if (fluencySession.status === 'ABANDONED') {
    return errorResponse('Session has been abandoned', 'SESSION_ABANDONED', 409);
  }

  // Validate sequential round order (can't skip rounds)
  const existingRoundNumbers = fluencySession.rounds.map((r) => r.roundNumber);
  const expectedNext = existingRoundNumbers.length + 1;
  if (roundNumber !== expectedNext) {
    return errorResponse(
      `Round ${String(roundNumber)} cannot be created — expected round ${String(expectedNext)}`,
      'ROUND_OUT_OF_ORDER',
      409,
    );
  }

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
    data: {
      fluencySessionId,
      roundNumber,
      targetMinutes,
      speakingSessionId,
    },
  });

  // After Round 3: mark session completed and backfill metrics
  if (roundNumber === 3) {
    await prisma.timedFluencySession.update({
      where: { id: fluencySessionId },
      data: { status: 'COMPLETED' },
    });

    await backfillMetrics(fluencySessionId, logger);
  }

  logger.info(
    { fluencySessionId, roundId: round.id, roundNumber },
    'Fluency round created',
  );

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
    { route: 'fluency-sessions/[id]/rounds' },
  )(req);
