// Unit tests for runGrammarAnalysis pipeline orchestrator — DB reads, classification, scoring, and persistence
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    speakingSession: { findUnique: vi.fn(), update: vi.fn() },
    metricSnapshot: { updateMany: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/analysis/grammar', () => ({
  classifyDivergenceSpans: vi.fn(),
  scoreVerbAccuracy: vi.fn(),
}));

vi.mock('@/lib/analysis/buildCorpusEvidence', () => ({ buildCorpusEvidence: vi.fn() }));
vi.mock('@/lib/analysis/formatCorpusPrompt', () => ({ formatCorpusPrompt: vi.fn() }));
vi.mock('@/lib/observability', () => ({ logPipelineStage: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/prismaJson', () => ({ toInputJson: vi.fn((v: unknown) => v) }));

import { prisma } from '@/lib/prisma';
import { classifyDivergenceSpans, scoreVerbAccuracy } from '@/lib/analysis/grammar';
import { buildCorpusEvidence } from '@/lib/analysis/buildCorpusEvidence';
import { formatCorpusPrompt } from '@/lib/analysis/formatCorpusPrompt';
import { logPipelineStage } from '@/lib/observability';
import { logger } from '@/lib/logger';
import { runGrammarAnalysis } from './runGrammarAnalysis';
import type { GrammarFlag } from '@/lib/analysis/grammar';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SESSION_ID = 'session-abc-123';
const NORMALIZED = 'I went home yesterday.';

const validSpans = [
  {
    start: 0,
    end: 1,
    verbatimText: 'goed',
    normalizedText: 'went',
    type: 'substitution',
    confidence: 0.82,
  },
];

const makeFlag = (): GrammarFlag => ({
  spanIndex: 0,
  verbatimText: 'goed',
  normalizedText: 'went',
  classification: 'grammar_error',
  errorType: 'verb_tense',
  confidence: 0.9,
  explanation: 'Wrong past tense.',
  suggestion: 'Use "went".',
  corpusEvidence: null,
});

const makeVerbAccuracyResult = () => ({
  score: 7,
  level: 'high' as const,
  note: '1 grammar error(s) found in 1 divergence span(s). Most common: verb tense.',
  errorCount: 1,
  totalSpans: 1,
});

const makeCorpusEvidence = (): CorpusEvidence => ({
  vocabulary: new Map(),
  collocations: [],
  expressions: [],
  stats: {
    totalContentWords: 0,
    matchedWords: 0,
    cefrDistribution: {},
    avgFreqPerMillion: null,
  },
});

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function setupHappyPath(): void {
  vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
    verbatimTranscript: 'I goed home yesterday.',
    divergenceSpans: validSpans,
  } as never);

  vi.mocked(buildCorpusEvidence).mockResolvedValue(makeCorpusEvidence());
  vi.mocked(formatCorpusPrompt).mockReturnValue('');
  vi.mocked(classifyDivergenceSpans).mockResolvedValue([makeFlag()]);
  vi.mocked(scoreVerbAccuracy).mockReturnValue(makeVerbAccuracyResult());
  vi.mocked(prisma.speakingSession.update).mockResolvedValue({} as never);
  vi.mocked(prisma.metricSnapshot.updateMany).mockResolvedValue({ count: 1 } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runGrammarAnalysis', () => {
  describe('early returns', () => {
    it('returns early and logs when session has no verbatimTranscript', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: null,
        divergenceSpans: validSpans,
      } as never);

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(classifyDivergenceSpans).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: SESSION_ID }),
        expect.stringContaining('skipped'),
      );
    });

    it('returns early when session has null divergenceSpans', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: 'I goed home.',
        divergenceSpans: null,
      } as never);

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(classifyDivergenceSpans).not.toHaveBeenCalled();
    });

    it('returns early when session is null', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue(null as never);

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(classifyDivergenceSpans).not.toHaveBeenCalled();
    });

    it('returns early and logs when divergenceSpans parses to empty array', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: 'I goed home.',
        divergenceSpans: [],
      } as never);

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(classifyDivergenceSpans).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: SESSION_ID }),
        expect.stringContaining('skipped'),
      );
    });
  });

  describe('happy path', () => {
    it('calls classifyDivergenceSpans with parsed spans and corpus evidence', async () => {
      setupHappyPath();
      vi.mocked(formatCorpusPrompt).mockReturnValue('<evidence />');

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(classifyDivergenceSpans).toHaveBeenCalledWith({
        normalizedTranscript: NORMALIZED,
        verbatimTranscript: 'I goed home yesterday.',
        divergenceSpans: expect.arrayContaining([
          expect.objectContaining({ verbatimText: 'goed', type: 'substitution' }),
        ]),
        corpusEvidence: '<evidence />',
      });
    });

    it('passes null corpusEvidence when formatCorpusPrompt returns empty string', async () => {
      setupHappyPath();
      vi.mocked(formatCorpusPrompt).mockReturnValue('');

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(classifyDivergenceSpans).toHaveBeenCalledWith(
        expect.objectContaining({ corpusEvidence: null }),
      );
    });

    it('calls scoreVerbAccuracy with the classified flags and span count', async () => {
      setupHappyPath();

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(scoreVerbAccuracy).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ classification: 'grammar_error' })]),
        validSpans.length,
      );
    });

    it('persists grammar flags via $transaction', async () => {
      setupHappyPath();

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.speakingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: SESSION_ID } }),
      );
    });

    it('overrides verbAccuracy metric via metricSnapshot.updateMany', async () => {
      setupHappyPath();

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(prisma.metricSnapshot.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: SESSION_ID, key: 'verbAccuracy' },
          data: expect.objectContaining({
            score: 7,
            level: 'high',
          }),
        }),
      );
    });

    it('logs the pipeline stage with success=true and metadata', async () => {
      setupHappyPath();

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(logPipelineStage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: SESSION_ID,
          stage: 'grammar-analysis',
          success: true,
          metadata: expect.objectContaining({
            totalSpans: validSpans.length,
            grammarErrors: 1,
            verbAccuracyScore: 7,
          }),
        }),
      );
    });

    it('logs completion at info level', async () => {
      setupHappyPath();

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: SESSION_ID }),
        'Grammar analysis complete',
      );
    });
  });

  describe('error resilience', () => {
    it('does NOT throw when classifyDivergenceSpans rejects — pipeline continues', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: 'I goed home.',
        divergenceSpans: validSpans,
      } as never);
      vi.mocked(buildCorpusEvidence).mockResolvedValue(makeCorpusEvidence());
      vi.mocked(formatCorpusPrompt).mockReturnValue('');
      vi.mocked(classifyDivergenceSpans).mockRejectedValue(new Error('Claude API unavailable'));

      await expect(runGrammarAnalysis(SESSION_ID, NORMALIZED)).resolves.toBeUndefined();
    });

    it('logs error when classifier throws', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: 'I goed home.',
        divergenceSpans: validSpans,
      } as never);
      vi.mocked(buildCorpusEvidence).mockResolvedValue(makeCorpusEvidence());
      vi.mocked(formatCorpusPrompt).mockReturnValue('');
      vi.mocked(classifyDivergenceSpans).mockRejectedValue(new Error('Claude API unavailable'));

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: SESSION_ID }),
        expect.stringContaining('Grammar analysis failed'),
      );
    });

    it('logs pipeline stage with success=false when an error is caught', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: 'I goed home.',
        divergenceSpans: validSpans,
      } as never);
      vi.mocked(buildCorpusEvidence).mockResolvedValue(makeCorpusEvidence());
      vi.mocked(formatCorpusPrompt).mockReturnValue('');
      vi.mocked(classifyDivergenceSpans).mockRejectedValue(new Error('timeout'));

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      expect(logPipelineStage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: SESSION_ID,
          stage: 'grammar-analysis',
          success: false,
        }),
      );
    });

    it('does NOT throw when the DB transaction rejects', async () => {
      setupHappyPath();
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB constraint'));

      await expect(runGrammarAnalysis(SESSION_ID, NORMALIZED)).resolves.toBeUndefined();
    });

    it('ignores malformed divergenceSpans JSON — returns early without crashing', async () => {
      vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
        verbatimTranscript: 'I goed home.',
        divergenceSpans: [{ bad: 'schema' }],
      } as never);

      await runGrammarAnalysis(SESSION_ID, NORMALIZED);

      // Malformed spans parse to [] → early return path (no classify call)
      expect(classifyDivergenceSpans).not.toHaveBeenCalled();
    });
  });
});
