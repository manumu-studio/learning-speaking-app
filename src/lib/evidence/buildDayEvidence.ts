// Assembles all evidence for a day across all sessions
import { prisma } from '@/lib/prisma';
import type { EvidenceBundle, CorpusEvidenceRef } from './evidence.types';
import { buildSessionEvidence } from './buildSessionEvidence';

export async function buildDayEvidence(
  userId: string,
  date: string,
): Promise<EvidenceBundle> {
  const sessions = await prisma.speakingSession.findMany({
    where: {
      userId,
      status: 'DONE',
      createdAt: {
        gte: new Date(`${date}T00:00:00`),
        lt: new Date(`${date}T23:59:59.999`),
      },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const bundles = await Promise.all(
    sessions.map((s) => buildSessionEvidence(s.id)),
  );

  const seenCorpus = new Set<string>();
  const deduped: CorpusEvidenceRef[] = [];
  for (const bundle of bundles) {
    for (const ref of bundle.corpus) {
      if (!seenCorpus.has(ref.lexemeId)) {
        seenCorpus.add(ref.lexemeId);
        deduped.push(ref);
      }
    }
  }

  return {
    entityType: 'day',
    entityId: date,
    metrics: bundles.flatMap((b) => b.metrics),
    transcript: bundles.flatMap((b) => b.transcript),
    grammar: bundles.flatMap((b) => b.grammar),
    pronunciation: bundles.flatMap((b) => b.pronunciation),
    naturalness: bundles.flatMap((b) => b.naturalness),
    corpus: deduped,
    pipelineMetadata: bundles[0]?.pipelineMetadata ?? null,
  };
}
