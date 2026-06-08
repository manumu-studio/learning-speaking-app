// Builds NaturalnessEvidence from NaturalnessFlag rows
import { prisma } from '@/lib/prisma';
import type { NaturalnessEvidence } from './evidence.types';

export async function buildNaturalnessEvidence(
  sessionId: string,
): Promise<NaturalnessEvidence[]> {
  const flags = await prisma.naturalnessFlag.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return flags.map((flag) => ({
    ref: {
      source: 'naturalness_flag' as const,
      table: 'NaturalnessFlag',
      rowId: flag.id,
      field: null,
    },
    label: `${flag.flagType}: "${flag.originalPhrase}"`,
    rawValue: flag,
    displayValue: `${flag.originalPhrase} → ${flag.suggestedPhrase}`,
    timestamp: flag.createdAt.toISOString(),
    sessionId,
    flagType: flag.flagType,
    collocationMetric: flag.metricValue,
    suggestion: flag.suggestedPhrase,
  }));
}
