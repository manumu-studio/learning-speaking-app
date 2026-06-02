// Helpers for POST /api/fluency-sessions/[id]/rounds — validation and session completion
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/lib/api';
import type pino from 'pino';

/** Maps round number to target duration in minutes: 1→4, 2→3, 3→2. */
export const ROUND_TARGET_MINUTES: Record<1 | 2 | 3, number> = {
  1: 4,
  2: 3,
  3: 2,
};

export type FluencySessionWithRounds = Awaited<ReturnType<typeof fetchFluencySession>>;

/** Fetches the fluency session with its rounds, or null if not found. */
export async function fetchFluencySession(fluencySessionId: string, userId: string) {
  return prisma.timedFluencySession.findFirst({
    where: { id: fluencySessionId, userId },
    include: {
      rounds: { select: { roundNumber: true }, orderBy: { roundNumber: 'asc' } },
    },
  });
}

/** Validates session status and round ordering; returns an error Response or null. */
export function validateRoundCreation(
  fluencySession: NonNullable<FluencySessionWithRounds>,
  roundNumber: 1 | 2 | 3,
): Response | null {
  if (fluencySession.status === 'COMPLETED') {
    return errorResponse('Session is already completed', 'SESSION_COMPLETED', 409);
  }

  if (fluencySession.status === 'ABANDONED') {
    return errorResponse('Session has been abandoned', 'SESSION_ABANDONED', 409);
  }

  const existingRoundNumbers = fluencySession.rounds.map((r) => r.roundNumber);
  const expectedNext = existingRoundNumbers.length + 1;
  if (roundNumber !== expectedNext) {
    return errorResponse(
      `Round ${String(roundNumber)} cannot be created — expected round ${String(expectedNext)}`,
      'ROUND_OUT_OF_ORDER',
      409,
    );
  }

  return null;
}

/** Backfills speechRateWpm and fillerCount for all rounds in a completed session. */
export async function backfillMetrics(fluencySessionId: string, logger: pino.Logger): Promise<void> {
  const rounds = await prisma.timedFluencyRound.findMany({
    where: { fluencySessionId },
    select: { id: true, speakingSessionId: true },
  });

  for (const round of rounds) {
    if (!round.speakingSessionId) continue;

    const [rateSnapshot, fillerInsights] = await Promise.all([
      prisma.metricSnapshot.findFirst({
        where: { sessionId: round.speakingSessionId, key: 'speakingRate' },
        select: { score: true },
      }),
      prisma.insight.count({
        where: { sessionId: round.speakingSessionId, category: 'fillerUsage' },
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

/** Sets the fluency session to COMPLETED and backfills metrics for all rounds. */
export async function completeFluencySession(
  fluencySessionId: string,
  logger: pino.Logger,
): Promise<void> {
  await prisma.timedFluencySession.update({
    where: { id: fluencySessionId },
    data: { status: 'COMPLETED' },
  });

  await backfillMetrics(fluencySessionId, logger);
}
