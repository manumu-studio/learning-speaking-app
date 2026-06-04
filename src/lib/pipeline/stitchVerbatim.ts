// Stitches per-chunk verbatim transcripts and computes divergence against the normalized transcript.
import { prisma } from '@/lib/prisma';
import { detectDivergence } from '@/lib/analysis/divergence';
import type { VerbatimWord } from '@/lib/assemblyai/transcribe';
import { toInputJson } from '@/lib/prismaJson';
import { logger } from '@/lib/logger';
import type { ChunkResult } from '@prisma/client';

function isVerbatimWordArray(value: unknown): value is VerbatimWord[] {
  return Array.isArray(value) && value.every(
    (w) => typeof w === 'object' && w !== null && 'text' in w && 'confidence' in w,
  );
}

export async function stitchVerbatimAndPersist(
  sessionId: string,
  normalizedText: string,
  doneChunks: ChunkResult[],
): Promise<void> {
  const chunksWithVerbatim = doneChunks.filter((c) => c.verbatimText !== null);
  if (chunksWithVerbatim.length === 0) return;

  const allWords: VerbatimWord[] = [];
  for (const chunk of chunksWithVerbatim) {
    if (isVerbatimWordArray(chunk.verbatimWords)) {
      allWords.push(...chunk.verbatimWords);
    }
  }

  const fullVerbatimText = chunksWithVerbatim.map((c) => c.verbatimText).join(' ');
  const spans = detectDivergence(normalizedText, allWords);

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      verbatimTranscript: fullVerbatimText,
      verbatimWordCount: allWords.length,
      verbatimProvider: 'assemblyai',
      divergenceSpans: toInputJson(spans),
    },
  });

  logger.info(
    { sessionId, verbatimWordCount: allWords.length, divergenceSpanCount: spans.length },
    'Verbatim stitched and divergence persisted',
  );
}
