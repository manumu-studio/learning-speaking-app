// Assembles all evidence for a single session into an EvidenceBundle
import { prisma } from '@/lib/prisma';
import type { EvidenceBundle } from './evidence.types';
import { buildMetricEvidence } from './buildMetricEvidence';
import { buildTranscriptEvidence } from './buildTranscriptEvidence';
import { buildGrammarEvidence } from './buildGrammarEvidence';
import { buildPronunciationEvidence } from './buildPronunciationEvidence';
import { buildNaturalnessEvidence } from './buildNaturalnessEvidence';
import { buildCorpusEvidence } from './buildCorpusEvidence';

export async function buildSessionEvidence(sessionId: string): Promise<EvidenceBundle> {
  const [metrics, transcript, grammar, pronunciation, naturalness, corpus, session] =
    await Promise.all([
      buildMetricEvidence(sessionId),
      buildTranscriptEvidence(sessionId),
      buildGrammarEvidence(sessionId),
      buildPronunciationEvidence(sessionId),
      buildNaturalnessEvidence(sessionId),
      buildCorpusEvidence(sessionId),
      prisma.speakingSession.findUnique({
        where: { id: sessionId },
        select: {
          verbatimProvider: true,
          createdAt: true,
          _count: { select: { chunks: true } },
        },
      }),
    ]);

  return {
    entityType: 'session',
    entityId: sessionId,
    metrics,
    transcript,
    grammar,
    pronunciation,
    naturalness,
    corpus,
    pipelineMetadata: session
      ? {
          asrProvider: 'whisper',
          verbatimProvider: session.verbatimProvider,
          modelVersion: null,
          processingTimestamp: session.createdAt.toISOString(),
          chunkCount: session._count.chunks,
        }
      : null,
  };
}
