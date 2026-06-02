// Persists merged naturalness flags to the database
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { NaturalnessFlagInput } from '@/lib/naturalness/naturalness.types';

/**
 * Persists an array of naturalness flags for a session. Idempotent — deletes
 * any existing flags for the session before inserting fresh ones.
 */
export async function persistNaturalnessFlags(
  userId: string,
  sessionId: string,
  flags: NaturalnessFlagInput[],
): Promise<void> {
  if (flags.length === 0) return;

  await prisma.naturalnessFlag.deleteMany({ where: { sessionId } });

  await prisma.naturalnessFlag.createMany({
    data: flags.map((flag) => ({
      sessionId,
      userId,
      originalPhrase: flag.originalPhrase,
      suggestedPhrase: flag.suggestedPhrase,
      flagType: flag.flagType,
      dimension: flag.dimension,
      confidence: flag.confidence,
      collocationMetric: flag.collocationMetric,
      metricValue: flag.metricValue,
      l1TransferSource: flag.l1TransferSource,
      rationale: flag.rationale,
      shownToUser: flag.shownToUser,
    })),
  });

  logger.info(
    { sessionId, flagCount: flags.length },
    'Naturalness flags persisted',
  );
}
