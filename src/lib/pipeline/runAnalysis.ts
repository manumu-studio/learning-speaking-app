// Runs the Claude analysis step: corpus lookup, transcript analysis, NER filtering, and logging
import { analyzeTranscript } from '@/lib/ai/analyze';
import { buildCorpusEvidence } from '@/lib/analysis/buildCorpusEvidence';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import { buildPronunciationSummary } from '@/lib/pipeline/pipelineHelpers';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';

export interface RunAnalysisOptions {
  sessionId: string;
  userId: string;
  analysisTranscriptText: string;
  userTranscriptText: string;
  focusMetricKey: string | null;
  promptUsed: string | null;
  pronunciationResult: PronunciationResult | null;
  analyzeStart: number;
}

export async function runAnalysis(options: RunAnalysisOptions) {
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

  const corpusStart = Date.now();
  const corpusEvidence = await buildCorpusEvidence(analysisTranscriptText);
  logPipelineStage({
    sessionId,
    stage: 'corpus-lookup',
    durationMs: Date.now() - corpusStart,
    success: true,
    metadata: {
      contentWords: corpusEvidence.stats.totalContentWords,
      matched: corpusEvidence.stats.matchedWords,
      collocations: corpusEvidence.collocations.filter((c) => c.lookup !== null).length,
      expressions: corpusEvidence.expressions.length,
    },
  });

  const analysis = await analyzeTranscript({
    transcript: analysisTranscriptText,
    focusMetricKey,
    pronunciationSummary,
    promptUsed,
    corpusEvidence,
  });

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
