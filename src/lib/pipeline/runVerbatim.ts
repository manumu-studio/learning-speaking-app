// Verbatim transcription + speaker filtering + divergence detection — runs alongside Whisper, best-effort.
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { transcribeVerbatim } from '@/lib/assemblyai/transcribe';
import type { VerbatimResult, VerbatimWord } from '@/lib/assemblyai/transcribe';
import { detectDivergence } from '@/lib/analysis/divergence';
import { filterSpeakerUtterances, type FilteredVerbatim } from '@/lib/analysis/filterSpeakerUtterances';
import { generatePresignedGetUrl } from '@/lib/storage/r2';
import { toInputJson } from '@/lib/prismaJson';
import { logPipelineStage } from '@/lib/observability';
import { logger } from '@/lib/logger';

const PRESIGN_EXPIRY_SECS = 600;

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface FinishedVerbatimResult {
  readonly rawVerbatimTranscript: string;
  readonly rawVerbatimWords: ReadonlyArray<VerbatimWord>;
  readonly filtered: FilteredVerbatim;
}

// ---------------------------------------------------------------------------
// Start (kick off in parallel — never rejects)
// ---------------------------------------------------------------------------

export function startVerbatim(audioKey: string): Promise<VerbatimResult | null> {
  return generatePresignedGetUrl(audioKey, PRESIGN_EXPIRY_SECS)
    .then((url) => transcribeVerbatim(url))
    .catch((error) => {
      logger.error({ err: error }, 'Verbatim transcription kickoff failed');
      return null;
    });
}

// ---------------------------------------------------------------------------
// Finish — await → filter → diverge → persist → return
// ---------------------------------------------------------------------------

export async function finishVerbatim(
  sessionId: string,
  normalizedText: string,
  verbatimPromise: Promise<VerbatimResult | null>,
): Promise<FinishedVerbatimResult | null> {
  const start = Date.now();
  try {
    const verbatim = await verbatimPromise;
    if (!verbatim) {
      logPipelineStage({ sessionId, stage: 'verbatim', durationMs: Date.now() - start, success: false });
      return null;
    }

    const filtered = filterSpeakerUtterances(verbatim.text, verbatim.words);

    const spans = detectDivergence(normalizedText, filtered.words);

    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        verbatimTranscript: verbatim.text,
        verbatimWordCount: verbatim.wordCount,
        verbatimProvider: 'assemblyai',
        divergenceSpans: spans.length > 0 ? toInputJson(spans) : Prisma.JsonNull,
      },
    });

    logPipelineStage({
      sessionId,
      stage: 'verbatim',
      durationMs: Date.now() - start,
      success: true,
      metadata: {
        rawWordCount: verbatim.wordCount,
        filteredWordCount: filtered.wordCount,
        removedWordCount: filtered.removedWordCount,
        divergenceSpanCount: spans.length,
      },
    });

    return {
      rawVerbatimTranscript: verbatim.text,
      rawVerbatimWords: verbatim.words,
      filtered,
    };
  } catch (error) {
    logger.error({ err: error, sessionId }, 'Verbatim persistence failed (pipeline continues)');
    logPipelineStage({ sessionId, stage: 'verbatim', durationMs: Date.now() - start, success: false });
    return null;
  }
}
