// Helper functions extracted from executePipeline — pronunciation summary builder, Azure step, and CEFR estimation
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import type { PronunciationSummary } from '@/lib/ai/analyze';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { logger } from '@/lib/logger';
import { AZURE_SDK_VERSION } from '@/lib/pipeline/persistPronunciation';
import type { MetricScoreInput } from '@/lib/cefr/cefr.types';

/**
 * Builds a lean `PronunciationSummary` for Claude from the full Azure result.
 * Returns null when Azure was skipped or failed.
 */
export function buildPronunciationSummary(
  result: PronunciationResult | null,
): PronunciationSummary | null {
  if (result == null) return null;

  const weakPhonemes = result.words
    .flatMap((w) => w.phonemes)
    .filter((p) => p.accuracyScore < 60)
    .map((p) => p.phoneme)
    .slice(0, 5);

  const l1Tags = [...new Set(result.words.flatMap((w) => w.l1Tags ?? []))];

  return {
    topWeakPhonemes: weakPhonemes,
    l1Tags,
    accuracyScore: result.accuracyScore,
    prosodyScore: result.prosodyScore,
  };
}

interface AzureContext {
  sessionId: string;
  userId: string;
  pcmBuffer: Buffer;
  transcript: string;
  azureKey: string;
  azureRegion: string;
}

/**
 * Runs Azure pronunciation assessment and tags Spanish L1 errors.
 * On Azure failure, persists a zero-score failure report and returns null.
 * When Azure credentials are absent, logs a skip notice and returns null.
 */
export async function runAzurePronunciation(
  ctx: AzureContext,
): Promise<PronunciationResult | null> {
  try {
    const result = await assessPronunciation(
      ctx.pcmBuffer,
      ctx.transcript,
      ctx.azureKey,
      ctx.azureRegion,
    );
    return { ...result, words: tagSpanishL1(result.words) };
  } catch (azureError) {
    const failureMessage =
      azureError instanceof Error ? azureError.message : 'Unknown error';

    logger.warn(
      {
        sessionId: ctx.sessionId,
        userId: ctx.userId,
        err: new Error(failureMessage),
      },
      'Pronunciation assessment failed — continuing without it',
    );

    await prisma.pronunciationReport.upsert({
      where: { sessionId: ctx.sessionId },
      create: {
        sessionId: ctx.sessionId,
        pronScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        prosodyScore: 0,
        speakingRateWpm: 0,
        azureSdkVersion: AZURE_SDK_VERSION,
        rawJson: Prisma.JsonNull,
        failureReason: failureMessage,
      },
      update: { failureReason: failureMessage },
    });

    return null;
  }
}

/**
 * Estimates the user's CEFR level from session metrics and persists it to the user profile.
 * No-ops when metrics is empty or the estimate returns null.
 */
export async function estimateCefrAndPersist(
  userId: string,
  metrics: MetricScoreInput[],
): Promise<void> {
  if (metrics.length === 0) return;

  const { estimateCefr } = await import('@/lib/cefr/estimateCefr');
  const cefrEstimate = estimateCefr(metrics);

  if (cefrEstimate === null) return;

  await prisma.user.update({
    where: { id: userId },
    data: { estimatedCefrLevel: cefrEstimate.level },
  });
}
