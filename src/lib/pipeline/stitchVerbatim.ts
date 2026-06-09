// Stitches per-chunk verbatim transcripts, filters coach speech, and computes divergence.
import { prisma } from '@/lib/prisma';
import { detectDivergence } from '@/lib/analysis/divergence';
import type { DivergenceSpan } from '@/lib/analysis/divergence/divergence.types';
import type { VerbatimWord } from '@/lib/assemblyai/transcribe';
import { filterSpeakerUtterances, type FilteredVerbatim } from '@/lib/analysis/filterSpeakerUtterances';
import { toInputJson } from '@/lib/prismaJson';
import { logger } from '@/lib/logger';
import type { ChunkResult } from '@prisma/client';

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface StitchedVerbatimResult {
  readonly rawVerbatimTranscript: string;
  readonly rawVerbatimWords: ReadonlyArray<VerbatimWord>;
  readonly rawWordCount: number;
  readonly filtered: FilteredVerbatim;
  readonly divergenceSpans: ReadonlyArray<DivergenceSpan>;
}

// ---------------------------------------------------------------------------
// Type guard for chunk verbatimWords JSON column
// ---------------------------------------------------------------------------

function isVerbatimWordArray(value: unknown): value is VerbatimWord[] {
  return Array.isArray(value) && value.every(
    (w) => typeof w === 'object' && w !== null && 'text' in w && 'confidence' in w,
  );
}

// ---------------------------------------------------------------------------
// Main export — assemble → filter → diverge → persist → return
// ---------------------------------------------------------------------------

export async function stitchVerbatimAndPersist(
  sessionId: string,
  normalizedText: string,
  doneChunks: ChunkResult[],
): Promise<StitchedVerbatimResult | null> {
  const chunksWithVerbatim = doneChunks.filter((c) => c.verbatimText !== null);
  if (chunksWithVerbatim.length === 0) return null;

  const allWords: VerbatimWord[] = [];
  for (const chunk of chunksWithVerbatim) {
    if (isVerbatimWordArray(chunk.verbatimWords)) {
      allWords.push(...chunk.verbatimWords);
    }
  }

  const rawVerbatimText = chunksWithVerbatim.map((c) => c.verbatimText).join(' ');

  const filtered = filterSpeakerUtterances(rawVerbatimText, allWords);

  const spans = detectDivergence(normalizedText, filtered.words);

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      verbatimTranscript: rawVerbatimText,
      verbatimWordCount: allWords.length,
      verbatimProvider: 'assemblyai',
      divergenceSpans: toInputJson(spans),
    },
  });

  logger.info(
    {
      sessionId,
      rawWordCount: allWords.length,
      filteredWordCount: filtered.wordCount,
      removedWordCount: filtered.removedWordCount,
      divergenceSpanCount: spans.length,
    },
    'Verbatim stitched, speaker-filtered, and divergence persisted',
  );

  return {
    rawVerbatimTranscript: rawVerbatimText,
    rawVerbatimWords: allWords,
    rawWordCount: allWords.length,
    filtered,
    divergenceSpans: spans,
  };
}
