// Deterministic filler upsert — writes verbatim-derived fillerUsage metric to DB.
import { prisma } from '@/lib/prisma';
import { countVerbatimFillers } from '@/lib/analysis/countVerbatimFillers';

export async function upsertDeterministicFiller(
  sessionId: string,
  filteredVerbatimText: string,
): Promise<void> {
  const result = countVerbatimFillers(filteredVerbatimText);
  await prisma.metricSnapshot.upsert({
    where: { sessionId_key: { sessionId, key: 'fillerUsage' } },
    create: { sessionId, key: 'fillerUsage', score: result.score, level: result.level, note: result.note },
    update: { score: result.score, level: result.level, note: result.note },
  });
}
