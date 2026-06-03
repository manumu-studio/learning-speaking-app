// Verbatim transcription + divergence detection — runs alongside Whisper, best-effort.
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { transcribeVerbatim } from '@/lib/assemblyai/transcribe';
import type { VerbatimResult } from '@/lib/assemblyai/transcribe';
import { detectDivergence } from '@/lib/analysis/divergence';
import { generatePresignedGetUrl } from '@/lib/storage/r2';
import { toInputJson } from '@/lib/prismaJson';
import { logPipelineStage } from '@/lib/observability';
import { logger } from '@/lib/logger';

// Presigned-URL lifetime — AssemblyAI fetches the audio within seconds of submission.
const PRESIGN_EXPIRY_SECS = 600;

/**
 * Kicks off verbatim transcription without awaiting, so it runs in parallel with
 * Whisper and scoring. Resolves to `null` on any failure (never rejects).
 *
 * @param audioKey - R2 storage key for the session audio.
 * @returns A promise of the verbatim result, or `null` if it could not be produced.
 */
export function startVerbatim(audioKey: string): Promise<VerbatimResult | null> {
  return generatePresignedGetUrl(audioKey, PRESIGN_EXPIRY_SECS)
    .then((url) => transcribeVerbatim(url))
    .catch((error) => {
      logger.error({ err: error }, 'Verbatim transcription kickoff failed');
      return null;
    });
}

/**
 * Awaits the verbatim result, computes divergence vs the normalized transcript, and
 * persists all four verbatim fields. Best-effort: never throws into the pipeline.
 *
 * @param sessionId - Session whose row receives the verbatim data.
 * @param normalizedText - The Whisper (display) transcript to diff against.
 * @param verbatimPromise - The in-flight promise from {@link startVerbatim}.
 */
export async function finishVerbatim(
  sessionId: string,
  normalizedText: string,
  verbatimPromise: Promise<VerbatimResult | null>,
): Promise<void> {
  const start = Date.now();
  try {
    const verbatim = await verbatimPromise;
    const spans = verbatim ? detectDivergence(normalizedText, verbatim.words) : [];

    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        verbatimTranscript: verbatim?.text ?? null,
        verbatimWordCount: verbatim?.wordCount ?? null,
        verbatimProvider: verbatim ? 'assemblyai' : null,
        divergenceSpans: verbatim ? toInputJson(spans) : Prisma.JsonNull,
      },
    });

    logPipelineStage({
      sessionId,
      stage: 'verbatim',
      durationMs: Date.now() - start,
      success: verbatim != null,
      metadata: { verbatimWordCount: verbatim?.wordCount ?? 0, divergenceSpanCount: spans.length },
    });
  } catch (error) {
    logger.error({ err: error, sessionId }, 'Verbatim persistence failed (pipeline continues)');
    logPipelineStage({ sessionId, stage: 'verbatim', durationMs: Date.now() - start, success: false });
  }
}
