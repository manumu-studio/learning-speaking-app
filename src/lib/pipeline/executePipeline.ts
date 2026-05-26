// Executes the full speaking session processing pipeline — transcription, pronunciation scoring, analysis, metrics, patterns
import { Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import type { PronunciationSummary } from '@/lib/ai/analyze';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { toPcm16kMonoWav } from '@/lib/audio/transcode';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { env } from '@/lib/env';
import { log } from '@/lib/logger';
import { AZURE_SDK_VERSION } from '@/lib/pipeline/persistPronunciation';

type PipelineMode = 'production' | 'dev';

// Build a lean pronunciation summary for Claude from the full Azure result.
// Returns null when Azure was skipped or failed.
function buildPronunciationSummary(
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

export async function executePipeline(
  sessionId: string,
  mode: PipelineMode
): Promise<void> {
  const startTime = Date.now();

  // Step 1: Fetch session
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      audioUrl: true,
      focusMetricKey: true,
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Step 2: Status guard — production only allows retriable states, dev allows re-runs
  const retriableStatuses: SessionStatus[] = [
    SessionStatus.UPLOADED,
    SessionStatus.TRANSCRIBING,
    SessionStatus.SCORING,
    SessionStatus.ANALYZING,
  ];

  if (!retriableStatuses.includes(session.status)) {
    if (mode === 'production') {
      throw new Error(`Session in invalid state: ${session.status}`);
    }
    // Dev mode: allow re-runs from any state (e.g. DONE, FAILED)
  }

  if (!session.audioUrl) {
    throw new Error('Session missing audio URL');
  }

  const id = session.id;
  const audioKey = session.audioUrl;

  log({
    level: 'info',
    message: `${mode} pipeline starting`,
    sessionId: id,
    userId: session.userId,
  });

  // Step 3: Download audio from R2
  const audioBuffer = await getAudio(audioKey);

  // Step 4: Transcode to PCM 16kHz mono WAV (Azure requires this format)
  const pcmBuffer = await toPcm16kMonoWav(audioBuffer);

  // Step 5: Mark TRANSCRIBING
  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.TRANSCRIBING },
  });

  // Step 6: Transcribe audio with Whisper (opus buffer is fine for Whisper)
  const transcriptText = await transcribeAudio(audioBuffer, `session-${id}.webm`);
  const wordCount = transcriptText.trim().split(/\s+/).length;

  log({
    level: 'info',
    message: 'Transcription complete',
    sessionId: id,
    userId: session.userId,
    metadata: { wordCount },
  });

  // Step 7: Store transcript — production creates, dev upserts for re-run safety
  if (mode === 'dev') {
    await prisma.transcript.upsert({
      where: { sessionId: id },
      create: { sessionId: id, text: transcriptText, wordCount },
      update: { text: transcriptText, wordCount },
    });
  } else {
    await prisma.transcript.create({
      data: { sessionId: id, text: transcriptText, wordCount },
    });
  }

  // Step 8: Mark SCORING
  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.SCORING },
  });

  // Steps 9–14 wrapped in try/finally to guarantee R2 cleanup regardless of errors
  let pronunciationResult: PronunciationResult | null = null;

  try {
    // Step 9: Azure pronunciation assessment (optional — skipped when credentials are absent)
    if (env.AZURE_SPEECH_KEY !== undefined && env.AZURE_SPEECH_REGION !== undefined) {
      try {
        pronunciationResult = await assessPronunciation(
          pcmBuffer,
          transcriptText,
          env.AZURE_SPEECH_KEY,
          env.AZURE_SPEECH_REGION,
        );
        pronunciationResult = {
          ...pronunciationResult,
          words: tagSpanishL1(pronunciationResult.words),
        };
      } catch (azureError) {
        const failureMessage =
          azureError instanceof Error ? azureError.message : 'Unknown error';

        log({
          level: 'warn',
          message: 'Pronunciation assessment failed — continuing without it',
          sessionId: id,
          userId: session.userId,
          error: failureMessage,
        });

        await prisma.pronunciationReport.upsert({
          where: { sessionId: id },
          create: {
            sessionId: id,
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
          update: {
            failureReason: failureMessage,
          },
        });
      }
    } else {
      log({
        level: 'info',
        message: 'Pronunciation assessment skipped: Azure credentials not configured',
        sessionId: id,
        userId: session.userId,
      });
    }

    // Step 10: Mark ANALYZING
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.ANALYZING },
    });

    // Step 11: Persist pronunciation results when Azure succeeded
    if (pronunciationResult != null) {
      const { persistPronunciation } = await import('@/lib/pipeline/persistPronunciation');
      await persistPronunciation(id, pronunciationResult);
    }

    // Step 12: Analyze transcript with Claude (pronunciation summary added when available)
    const pronunciationSummary = buildPronunciationSummary(pronunciationResult ?? null);
    const analysis = await analyzeTranscript(
      transcriptText,
      session.focusMetricKey,
      pronunciationSummary,
    );

    log({
      level: 'info',
      message: 'Analysis complete',
      sessionId: id,
      userId: session.userId,
      metadata: { insightCount: analysis.insights.length },
    });

    // Step 13: Store insights — dev deletes existing first for re-run safety
    if (mode === 'dev') {
      await prisma.insight.deleteMany({ where: { sessionId: id } });
    }

    await prisma.insight.createMany({
      data: analysis.insights.map((insight) => ({
        sessionId: id,
        category: insight.category,
        pattern: insight.pattern,
        detail: insight.detail,
        frequency: insight.frequency ?? null,
        severity: insight.severity ?? null,
        examples: insight.examples ?? Prisma.JsonNull,
        suggestion: insight.suggestion ?? null,
      })),
    });

    // Step 14: Store metric snapshots — dev deletes existing first
    if (analysis.metrics.length > 0) {
      if (mode === 'dev') {
        await prisma.metricSnapshot.deleteMany({ where: { sessionId: id } });
      }

      await prisma.metricSnapshot.createMany({
        data: analysis.metrics.map((metric) => ({
          sessionId: id,
          key: metric.key,
          level: metric.level,
          score: metric.score,
          note: metric.note,
        })),
        skipDuplicates: true,
      });
    }

    // Step 15: Store focusNext, summary, and intentLabel on the session
    await prisma.speakingSession.update({
      where: { id },
      data: {
        focusNext: analysis.focusNext,
        summary: analysis.summary,
        intentLabel: analysis.intentLabel,
      },
    });

    // Step 16: Aggregate insights into user's long-term pattern profile
    await updatePatternProfile(session.userId, analysis.insights);

    // Step 17: Mark DONE
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.DONE },
    });

    const processingDuration = Date.now() - startTime;
    log({
      level: 'info',
      message: `${mode} pipeline complete`,
      sessionId: id,
      userId: session.userId,
      duration: processingDuration,
    });
  } finally {
    // R2 audio deletion always runs — moved here from after Whisper so Azure can use pcmBuffer
    try {
      await deleteAudio(audioKey);
      await prisma.speakingSession.update({
        where: { id },
        data: { audioDeletedAt: new Date() },
      });
    } catch (deleteError) {
      log({
        level: 'warn',
        message: 'Failed to delete audio from R2 (non-blocking)',
        sessionId: id,
        error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
      });
    }
  }
}
