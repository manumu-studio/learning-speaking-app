// Orchestrates grammar classification — reads divergence spans, calls Claude classifier, scores verbAccuracy, persists
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { classifyDivergenceSpans, scoreVerbAccuracy } from '@/lib/analysis/grammar';
import type { DivergenceSpan } from '@/lib/analysis/divergence';
import { buildCorpusEvidence } from '@/lib/analysis/buildCorpusEvidence';
import { formatCorpusPrompt } from '@/lib/analysis/formatCorpusPrompt';
import { toInputJson } from '@/lib/prismaJson';
import { logPipelineStage } from '@/lib/observability';
import { logger } from '@/lib/logger';

const divergenceSpanSchema = z.object({
  start: z.number(),
  end: z.number(),
  verbatimText: z.string(),
  normalizedText: z.string(),
  type: z.enum(['insertion', 'deletion', 'substitution']),
  confidence: z.number(),
});

function parseDivergenceSpans(raw: unknown): DivergenceSpan[] {
  const result = z.array(divergenceSpanSchema).safeParse(raw);
  return result.success ? result.data : [];
}

interface ClassifyPersistOpts {
  sessionId: string;
  normalizedTranscript: string;
  verbatimTranscript: string;
  spans: DivergenceSpan[];
  start: number;
}

interface RunGrammarAnalysisOptions {
  readonly verbatimTranscript?: string;
}

async function classifyAndPersist(opts: ClassifyPersistOpts): Promise<void> {
  const { sessionId, normalizedTranscript, verbatimTranscript, spans, start } = opts;
  const corpusEvidence = await buildCorpusEvidence(normalizedTranscript);
  const corpusPrompt = formatCorpusPrompt(corpusEvidence);

  let flags: Awaited<ReturnType<typeof classifyDivergenceSpans>>;
  const classifyStart = Date.now();
  try {
    flags = await classifyDivergenceSpans({
      normalizedTranscript,
      verbatimTranscript,
      divergenceSpans: spans,
      corpusEvidence: corpusPrompt || null,
    });
  } catch (err) {
    logger.error({ sessionId, error: String(err) }, 'grammar-classifier-failed');
    logPipelineStage({ sessionId, stage: 'grammar-classify', durationMs: Date.now() - classifyStart, success: false });
    return;
  }

  logPipelineStage({ sessionId, stage: 'grammar-classify', durationMs: Date.now() - classifyStart, success: true });
  logger.info({ sessionId, spanCount: spans.length, flagCount: flags.length }, 'grammar-pipeline-classified');

  const verbAccuracyResult = scoreVerbAccuracy(flags, spans.length);

  await prisma.$transaction([
    prisma.speakingSession.update({ where: { id: sessionId }, data: { grammarFlags: toInputJson(flags) } }),
    prisma.metricSnapshot.updateMany({
      where: { sessionId, key: 'verbAccuracy' },
      data: { score: verbAccuracyResult.score, level: verbAccuracyResult.level, note: verbAccuracyResult.note },
    }),
  ]);

  logPipelineStage({
    sessionId, stage: 'grammar-analysis', durationMs: Date.now() - start, success: true,
    metadata: { totalSpans: spans.length, grammarErrors: verbAccuracyResult.errorCount, verbAccuracyScore: verbAccuracyResult.score },
  });
  logger.info({ sessionId, totalSpans: spans.length, grammarErrors: verbAccuracyResult.errorCount }, 'Grammar analysis complete');
}

export async function runGrammarAnalysis(
  sessionId: string,
  normalizedTranscript: string,
  options: RunGrammarAnalysisOptions = {},
): Promise<void> {
  const start = Date.now();
  try {
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      select: { divergenceSpans: true, verbatimTranscript: true },
    });

    if (!session) {
      logger.info({ sessionId, hasVerbatim: false, hasSpans: false }, 'grammar-pipeline-start');
      logger.info({ sessionId, reason: 'no-session' }, 'grammar-pipeline-skip');
      return;
    }

    const verbatimTranscript = options.verbatimTranscript ?? session.verbatimTranscript;

    logger.info({ sessionId, hasVerbatim: !!verbatimTranscript, hasSpans: session.divergenceSpans != null }, 'grammar-pipeline-start');

    if (!verbatimTranscript) { logger.info({ sessionId, reason: 'no-verbatim' }, 'grammar-pipeline-skip'); return; }
    if (session.divergenceSpans == null) { logger.info({ sessionId, reason: 'no-spans' }, 'grammar-pipeline-skip'); return; }

    const spans = parseDivergenceSpans(session.divergenceSpans);
    if (spans.length === 0) {
      logger.info({ sessionId, reason: 'zero-spans' }, 'grammar-pipeline-skip');
      await prisma.speakingSession.update({ where: { id: sessionId }, data: { grammarFlags: toInputJson([]) } });
      return;
    }

    await classifyAndPersist({ sessionId, normalizedTranscript, verbatimTranscript, spans, start });
  } catch (error) {
    logger.error({ err: error, sessionId }, 'Grammar analysis failed (pipeline continues)');
    logPipelineStage({ sessionId, stage: 'grammar-analysis', durationMs: Date.now() - start, success: false });
  }
}
