// Executes the full speaking session processing pipeline — transcription, pronunciation scoring, analysis, metrics, patterns
import { SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/ai/whisper';
import { gateSegments } from '@/lib/ai/confidenceGating';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import { toPcm16kMonoWav } from '@/lib/audio/transcode';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';
import {
  buildPronunciationSummary,
  estimateCefrAndPersist,
  runAzurePronunciation,
} from '@/lib/pipeline/pipelineHelpers';
import {
  storeTranscript,
  storeInsights,
  storeMetrics,
  storeSessionFinalData,
  cleanupSessionAudio,
  validateSessionState,
} from '@/lib/pipeline/executePipelineHelpers';

type PipelineMode = 'production' | 'dev';

// ---------------------------------------------------------------------------
// Transcription step
// ---------------------------------------------------------------------------

interface TranscriptionOutput {
  userTranscriptText: string;
  analysisTranscriptText: string;
  wordCount: number;
}

async function runTranscription(
  sessionId: string,
  userId: string,
  audioBuffer: Buffer,
): Promise<TranscriptionOutput> {
  const transcribeStart = Date.now();
  const whisperResult = await transcribeAudio(audioBuffer, `session-${sessionId}.webm`);
  const gated = gateSegments(whisperResult.segments);

  const userTranscriptText =
    gated.cleanText.length > 0 ? gated.cleanText : whisperResult.text;
  const analysisTranscriptText =
    gated.annotatedText.length > 0 ? gated.annotatedText : whisperResult.text;
  const wordCount = userTranscriptText.trim().split(/\s+/).filter(Boolean).length;

  logPipelineStage({
    sessionId,
    stage: 'transcribe',
    durationMs: Date.now() - transcribeStart,
    success: true,
    metadata: { wordCount },
  });

  logger.info({ sessionId, userId, wordCount, gating: gated.stats }, 'Transcription complete');

  return { userTranscriptText, analysisTranscriptText, wordCount };
}

// ---------------------------------------------------------------------------
// Analysis step
// ---------------------------------------------------------------------------

interface RunAnalysisOptions {
  sessionId: string;
  userId: string;
  analysisTranscriptText: string;
  userTranscriptText: string;
  focusMetricKey: string | null;
  promptUsed: string | null;
  pronunciationResult: PronunciationResult | null;
  analyzeStart: number;
}

async function runAnalysis(options: RunAnalysisOptions) {
  const {
    sessionId,
    userId,
    analysisTranscriptText,
    userTranscriptText,
    focusMetricKey,
    promptUsed,
    pronunciationResult,
    analyzeStart,
  } = options;
  const pronunciationSummary = buildPronunciationSummary(pronunciationResult ?? null);
  const analysis = await analyzeTranscript(
    analysisTranscriptText,
    focusMetricKey,
    pronunciationSummary,
    promptUsed,
  );

  const nerFilterResult = filterTranscriptionArtefacts(analysis.insights, userTranscriptText);

  if (nerFilterResult.filtered.length > 0) {
    logger.info(
      {
        sessionId,
        userId,
        filteredCount: nerFilterResult.filtered.length,
        filterReasons: nerFilterResult.filterReasons,
      },
      'NER filter removed transcription false positives',
    );
  }

  if (
    analysis.possible_transcription_artefacts != null &&
    analysis.possible_transcription_artefacts.length > 0
  ) {
    logger.info(
      { sessionId, userId, artefacts: analysis.possible_transcription_artefacts },
      'Possible transcription artefacts detected',
    );
  }

  logPipelineStage({
    sessionId,
    stage: 'analyze',
    durationMs: Date.now() - analyzeStart,
    success: true,
    metadata: { insightCount: nerFilterResult.kept.length },
  });

  logger.info({ sessionId, userId, insightCount: nerFilterResult.kept.length }, 'Analysis complete');

  return { analysis, insightsForStorage: nerFilterResult.kept };
}

// ---------------------------------------------------------------------------
// Scoring + analysis step (steps 9–18)
// ---------------------------------------------------------------------------

interface ScoringAndAnalysisOptions {
  sessionId: string;
  userId: string;
  mode: PipelineMode;
  pcmBuffer: Buffer;
  userTranscriptText: string;
  analysisTranscriptText: string;
  focusMetricKey: string | null;
  promptUsed: string | null;
  startTime: number;
}

async function runScoringAndAnalysis(opts: ScoringAndAnalysisOptions): Promise<void> {
  const { sessionId, userId, mode, pcmBuffer, userTranscriptText, analysisTranscriptText, focusMetricKey, promptUsed, startTime } = opts;

  let pronunciationResult: PronunciationResult | null = null;

  // Step 9: Azure pronunciation assessment (optional)
  const scoringStart = Date.now();
  if (env.AZURE_SPEECH_KEY !== undefined && env.AZURE_SPEECH_REGION !== undefined) {
    pronunciationResult = await runAzurePronunciation({
      sessionId,
      userId,
      pcmBuffer,
      transcript: userTranscriptText,
      azureKey: env.AZURE_SPEECH_KEY,
      azureRegion: env.AZURE_SPEECH_REGION,
    });
  } else {
    logger.info({ sessionId, userId }, 'Pronunciation assessment skipped: Azure credentials not configured');
  }

  logPipelineStage({ sessionId, stage: 'scoring', durationMs: Date.now() - scoringStart, success: pronunciationResult != null });

  // Step 10: Mark ANALYZING
  await prisma.speakingSession.update({ where: { id: sessionId }, data: { status: SessionStatus.ANALYZING } });

  // Step 11: Persist pronunciation results
  if (pronunciationResult != null) {
    const { persistPronunciation } = await import('@/lib/pipeline/persistPronunciation');
    await persistPronunciation(sessionId, pronunciationResult);
  }

  // Step 12: Analyze transcript with Claude
  const analyzeStart = Date.now();
  const { analysis, insightsForStorage } = await runAnalysis({
    sessionId,
    userId,
    analysisTranscriptText,
    userTranscriptText,
    focusMetricKey,
    promptUsed,
    pronunciationResult,
    analyzeStart,
  });

  // Steps 13–14: Persist insights and metrics
  await storeInsights(sessionId, insightsForStorage, mode);
  await storeMetrics(sessionId, analysis.metrics, mode);

  // Step 15: Store session summary fields
  await storeSessionFinalData({
    sessionId,
    focusNext: analysis.focusNext,
    summary: analysis.summary,
    intentLabel: analysis.intentLabel,
    registerFeedback: analysis.registerFeedback,
  });

  // Step 16: Update pattern profile
  await updatePatternProfile(userId, insightsForStorage);

  // Step 17: Estimate CEFR level
  await estimateCefrAndPersist(userId, analysis.metrics);

  // Step 18: Mark DONE
  await prisma.speakingSession.update({ where: { id: sessionId }, data: { status: SessionStatus.DONE } });

  logger.info({ sessionId, userId, duration: Date.now() - startTime }, `${mode} pipeline complete`);
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/** Runs the full session processing pipeline: Whisper transcription, Azure pronunciation scoring, Claude analysis, and metric persistence. */
export async function executePipeline(
  sessionId: string,
  mode: PipelineMode,
): Promise<void> {
  const startTime = Date.now();

  // Step 1: Fetch session
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, status: true, audioUrl: true, focusMetricKey: true, promptUsed: true },
  });

  if (!session) throw new Error(`Session not found: ${sessionId}`);

  // Step 2: Status guard
  validateSessionState(session.status, mode);

  if (!session.audioUrl) throw new Error('Session missing audio URL');

  const { id, userId } = session;
  const audioKey = session.audioUrl;

  logger.info({ sessionId: id, userId }, `${mode} pipeline starting`);

  // Steps 3–4: Download and transcode audio
  const audioBuffer = await getAudio(audioKey);
  const pcmBuffer = await toPcm16kMonoWav(audioBuffer);

  // Step 5: Mark TRANSCRIBING
  await prisma.speakingSession.update({ where: { id }, data: { status: SessionStatus.TRANSCRIBING } });

  // Step 6: Transcribe
  const { userTranscriptText, analysisTranscriptText, wordCount } =
    await runTranscription(id, userId, audioBuffer);

  // Step 7: Store transcript
  await storeTranscript(id, userTranscriptText, wordCount, mode);

  // Step 8: Mark SCORING
  await prisma.speakingSession.update({ where: { id }, data: { status: SessionStatus.SCORING } });

  try {
    await runScoringAndAnalysis({
      sessionId: id,
      userId,
      mode,
      pcmBuffer,
      userTranscriptText,
      analysisTranscriptText,
      focusMetricKey: session.focusMetricKey,
      promptUsed: session.promptUsed ?? null,
      startTime,
    });
  } finally {
    await cleanupSessionAudio(id, audioKey, deleteAudio);
  }
}
