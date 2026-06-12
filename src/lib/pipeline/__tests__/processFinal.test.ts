// Integration-style tests for processFinal fan-in with mocked dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkStatus, SessionStatus } from '@prisma/client';

vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    speakingSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sessionChunk: {
      findMany: vi.fn(),
    },
    chunkResult: {
      findMany: vi.fn(),
    },
    transcript: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    insight: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    metricSnapshot: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    vocabSuggestion: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock('@/lib/ai/analyze', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/analyze')>();
  return {
    ...actual,
    analyzeTranscript: vi.fn(),
  };
});

vi.mock('@/lib/ai/nerFilter', () => ({
  filterTranscriptionArtefacts: vi.fn((insights: unknown[]) => ({
    kept: insights,
    filtered: [],
    filterReasons: [],
  })),
}));

vi.mock('@/lib/ai/l1Spanish', () => ({
  tagSpanishL1: vi.fn((words: unknown[]) => words),
}));

vi.mock('@/lib/pipeline/persistPronunciation', () => ({
  persistPronunciation: vi.fn(),
}));

vi.mock('@/lib/ai/polishTranscript', () => ({
  polishTranscript: vi.fn((text: string) => Promise.resolve(text)),
}));

vi.mock('@/lib/ai/rewriteTranscript', () => ({
  rewriteTranscript: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/ai/synthesize', () => ({
  synthesizeAnalysis: vi.fn(),
}));

vi.mock('@/lib/pipeline/updatePatternProfile', () => ({
  updatePatternProfile: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  logPipelineStage: vi.fn(),
  withObservability: vi.fn(),
  getRequestId: vi.fn(),
  withRequestId: vi.fn(),
  currentRequestId: vi.fn(),
  setSentryRequestContext: vi.fn(),
}));

vi.mock('@/lib/analysis/buildCorpusEvidence', () => ({
  buildCorpusEvidence: vi.fn(() => Promise.resolve({
    vocabulary: new Map(),
    collocations: [],
    expressions: [],
    stats: { totalContentWords: 0, matchedWords: 0, cefrDistribution: {}, avgFreqPerMillion: null },
  })),
}));

vi.mock('@/lib/pipeline/stitchVerbatim', () => ({
  stitchVerbatimAndPersist: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/pipeline/runGrammarAnalysis', () => ({
  runGrammarAnalysis: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/pipeline/upsertDeterministicFiller', () => ({
  upsertDeterministicFiller: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/pipeline/persistVocabSuggestions', () => ({
  persistVocabSuggestions: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/pipeline/detectVocabUsage', () => ({
  detectVocabUsage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/cefr/estimateCefr', () => ({
  estimateCefr: vi.fn(() => null),
}));

vi.mock('./processFinalHelpers', () => ({
  isJsonArray: vi.fn((v: unknown) => Array.isArray(v)),
  invalidateDailySummary: vi.fn(() => Promise.resolve()),
}));

import { prisma } from '@/lib/prisma';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import { synthesizeAnalysis } from '@/lib/ai/synthesize';
import { upsertDeterministicFiller } from '@/lib/pipeline/upsertDeterministicFiller';
import { stitchVerbatimAndPersist } from '@/lib/pipeline/stitchVerbatim';
import { processFinal, processParallelFinal } from '@/lib/pipeline/processFinal';

describe('processFinal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: SessionStatus.PROCESSING_FINAL,
      chunkCount: 1,
      isChunked: true,
      focusMetricKey: null,
      promptUsed: null,
      processedAt: null,
    } as never);

    vi.mocked(prisma.sessionChunk.findMany).mockResolvedValue([
      {
        chunkIndex: 0,
        durationSecs: 60,
        overlapSecs: 0,
        status: ChunkStatus.CHUNK_DONE,
        transcriptText: 'hello world',
        words: [{ word: 'hello', start: 0, end: 0.5 }, { word: 'world', start: 0.6, end: 1 }],
        pronScore: 80,
        accuracyScore: 80,
        fluencyScore: 75,
        completenessScore: 85,
        prosodyScore: 70,
        speakingRateWpm: 120,
        pronWords: [],
        pronRawJson: [],
      },
    ] as never);

    vi.mocked(analyzeTranscript).mockResolvedValue({
      focusNext: 'Keep going',
      summary: JSON.stringify({ wordCount: 2 }),
      intentLabel: 'Practice',
      insights: [],
      metrics: [],
      possible_transcription_artefacts: [],
    });
  });

  it('writes unified transcript and marks session done', async () => {
    await processFinal('session-1');

    expect(prisma.transcript.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'session-1' },
        create: expect.objectContaining({ text: 'hello world' }),
      }),
    );

    expect(prisma.speakingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: SessionStatus.DONE,
          processedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('returns early without duplicate writes when session is already done', async () => {
    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: SessionStatus.DONE,
      chunkCount: 1,
      isChunked: true,
      focusMetricKey: null,
      promptUsed: null,
      processedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);

    await processFinal('session-1');

    expect(prisma.transcript.upsert).not.toHaveBeenCalled();
    expect(prisma.insight.createMany).not.toHaveBeenCalled();
    expect(analyzeTranscript).not.toHaveBeenCalled();
  });

  it('is idempotent on re-drive — second call does not duplicate analysis', async () => {
    vi.mocked(analyzeTranscript).mockResolvedValue({
      focusNext: 'Keep going',
      summary: JSON.stringify({ wordCount: 2 }),
      intentLabel: 'Practice',
      insights: [{
        category: 'grammar',
        pattern: 'articles',
        detail: 'Missing article',
        frequency: 1,
        severity: 'low',
        examples: ['example'],
        suggestion: 'Add the',
      }],
      metrics: [],
      possible_transcription_artefacts: [],
    });

    await processFinal('session-1');

    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: SessionStatus.DONE,
      chunkCount: 1,
      isChunked: true,
      focusMetricKey: null,
      promptUsed: null,
      processedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never);

    await processFinal('session-1');

    expect(analyzeTranscript).toHaveBeenCalledTimes(1);
    expect(prisma.insight.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.speakingSession.update).toHaveBeenCalledTimes(1);
  });

  it('throws when session is not found', async () => {
    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue(null);

    await expect(processFinal('session-1')).rejects.toThrow('Session not found');
  });

  it('throws when chunks exist but none have CHUNK_DONE status', async () => {
    vi.mocked(prisma.sessionChunk.findMany).mockResolvedValue([
      {
        chunkIndex: 0,
        durationSecs: 60,
        overlapSecs: 0,
        status: ChunkStatus.TRANSCRIBING,
        transcriptText: null,
        words: null,
        pronScore: null,
        accuracyScore: null,
        fluencyScore: null,
        completenessScore: null,
        prosodyScore: null,
        speakingRateWpm: null,
        pronWords: null,
        pronRawJson: null,
      },
    ] as never);

    await expect(processFinal('session-1')).rejects.toThrow('Not all chunks are processed yet');
  });

  it('calls rewriteTranscript and persists improvedText when vocab suggestions exist', async () => {
    vi.mocked(analyzeTranscript).mockResolvedValue({
      focusNext: 'Keep going',
      summary: JSON.stringify({ wordCount: 2 }),
      intentLabel: 'Practice',
      insights: [],
      metrics: [],
      possible_transcription_artefacts: [],
      vocabularySuggestions: [
        { word: 'eloquent', meaning: 'fluent and persuasive', exampleSentence: 'She gave an eloquent speech.', type: 'word', domain: 'general', frequencyBand: 'low' },
      ],
    });

    vi.mocked(rewriteTranscript).mockResolvedValue({
      improvedText: 'hello eloquent world',
      wordsUsed: ['eloquent'],
    });

    await processFinal('session-1');

    expect(rewriteTranscript).toHaveBeenCalledWith(
      'hello world',
      [{ word: 'eloquent', meaning: 'fluent and persuasive', exampleSentence: 'She gave an eloquent speech.', type: 'word', domain: 'general', frequencyBand: 'low' }],
    );

    expect(prisma.transcript.update).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
      data: { improvedText: 'hello eloquent world', wordsUsed: ['eloquent'] },
    });
  });
});

describe('processParallelFinal', () => {
  const makeChunkResult = (chunkIndex: number, overrides: Record<string, unknown> = {}) => ({
    id: `cr-${chunkIndex}`,
    sessionId: 'sess-1',
    chunkIndex,
    status: 'DONE',
    durationSecs: 125,
    overlapSecs: chunkIndex === 0 ? 0 : 5,
    transcriptText: `chunk ${chunkIndex} transcript text here`,
    wordCount: 5,
    words: null,
    pronunciationReport: {
      pronScore: 80,
      accuracyScore: 80,
      fluencyScore: 75,
      completenessScore: 85,
      prosodyScore: 70,
      words: [],
    },
    insights: [{ category: 'grammar', pattern: 'Test', detail: 'detail', frequency: 1 }],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      status: SessionStatus.AWAITING_FINAL,
      focusMetricKey: null,
      promptUsed: null,
      processedAt: null,
    } as never);

    vi.mocked(prisma.chunkResult.findMany).mockResolvedValue([
      makeChunkResult(0),
      makeChunkResult(1),
    ] as never);

    vi.mocked(synthesizeAnalysis).mockResolvedValue({
      insights: [{ category: 'grammar' as const, pattern: 'Merged', detail: 'merged detail', frequency: 2, severity: 'medium' as const, examples: [] }],
      metrics: [{ key: 'connectorRepetition', level: 'medium', score: 6, note: 'OK' }],
      focusNext: 'Work on connectors',
      summary: 'Good session overall',
      intentLabel: 'Practice session',
      vocabularySuggestions: [],
    });
  });

  it('stitches transcripts and marks session DONE with all chunks', async () => {
    await processParallelFinal('sess-1');

    expect(prisma.transcript.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'sess-1' },
        create: expect.objectContaining({
          sessionId: 'sess-1',
          text: expect.any(String),
        }),
      }),
    );

    expect(prisma.speakingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1' },
        data: expect.objectContaining({
          status: SessionStatus.DONE,
          processedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('returns early when session is already DONE with processedAt', async () => {
    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      status: SessionStatus.DONE,
      focusMetricKey: null,
      promptUsed: null,
      processedAt: new Date(),
    } as never);

    await processParallelFinal('sess-1');

    expect(prisma.chunkResult.findMany).not.toHaveBeenCalled();
    expect(synthesizeAnalysis).not.toHaveBeenCalled();
  });

  it('polls until PROCESSING chunks settle before proceeding', async () => {
    let callCount = 0;
    vi.mocked(prisma.chunkResult.findMany)
      .mockResolvedValueOnce([
        makeChunkResult(0),
        makeChunkResult(1, { status: 'PROCESSING' }),
      ] as never)
      .mockImplementation((() => {
        callCount++;
        return Promise.resolve([
          makeChunkResult(0),
          makeChunkResult(1),
        ]) as never;
      }) as never);

    await processParallelFinal('sess-1');
    expect(callCount).toBeGreaterThanOrEqual(1);
    expect(synthesizeAnalysis).toHaveBeenCalled();
  }, 30_000);

  it('marks session FAILED when all chunks failed', async () => {
    vi.mocked(prisma.chunkResult.findMany).mockResolvedValue([
      makeChunkResult(0, { status: 'FAILED', transcriptText: null, pronunciationReport: null, insights: null }),
      makeChunkResult(1, { status: 'FAILED', transcriptText: null, pronunciationReport: null, insights: null }),
    ] as never);

    await processParallelFinal('sess-1');

    expect(prisma.speakingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SessionStatus.FAILED,
          errorMessage: 'All chunks failed processing',
        }),
      }),
    );
    expect(synthesizeAnalysis).not.toHaveBeenCalled();
  });

  it('sets partialResults true when some chunks failed', async () => {
    vi.mocked(prisma.chunkResult.findMany).mockResolvedValue([
      makeChunkResult(0),
      makeChunkResult(1, { status: 'FAILED', transcriptText: null, pronunciationReport: null, insights: null }),
    ] as never);

    await processParallelFinal('sess-1');

    expect(prisma.speakingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SessionStatus.DONE,
          partialResults: true,
        }),
      }),
    );
  });

  it('throws when session not found', async () => {
    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue(null);

    await expect(processParallelFinal('sess-1')).rejects.toThrow('Session not found');
  });

  it('calls synthesizeAnalysis with stitched transcript and chunk insights', async () => {
    await processParallelFinal('sess-1');

    expect(synthesizeAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        stitchedTranscript: expect.any(String),
        chunks: expect.arrayContaining([
          expect.objectContaining({ chunkIndex: 0 }),
          expect.objectContaining({ chunkIndex: 1 }),
        ]),
        focusMetricKey: null,
      }),
    );
  });

  it('scopes metricSnapshot delete to synthesis keys only, preserving pronunciation', async () => {
    await processParallelFinal('sess-1');

    expect(prisma.metricSnapshot.deleteMany).toHaveBeenCalledWith({
      where: {
        sessionId: 'sess-1',
        key: { in: ['connectorRepetition'] },
      },
    });
  });

  it('never deletes speakingRate from metricSnapshot (source-owned by Azure)', async () => {
    vi.mocked(synthesizeAnalysis).mockResolvedValue({
      insights: [],
      metrics: [
        { key: 'speakingRate', level: 'medium', score: 5, note: 'LLM says 5' },
        { key: 'connectorRepetition', level: 'high', score: 7, note: 'OK' },
      ],
      focusNext: 'Focus',
      summary: 'Summary',
      intentLabel: 'Practice',
      vocabularySuggestions: [],
    });

    await processParallelFinal('sess-1');

    const deleteCall = vi.mocked(prisma.metricSnapshot.deleteMany).mock.calls;
    for (const [args] of deleteCall) {
      const keysDeleted = (args as { where: { key: { in: string[] } } }).where.key.in;
      expect(keysDeleted).not.toContain('speakingRate');
    }
  });

  it('never deletes fillerUsage via synthesis persistence (source-owned by deterministic counter)', async () => {
    vi.mocked(synthesizeAnalysis).mockResolvedValue({
      insights: [],
      metrics: [
        { key: 'fillerUsage', level: 'low', score: 3, note: 'LLM filler score' },
        { key: 'structuralVariety', level: 'medium', score: 6, note: 'OK' },
      ],
      focusNext: 'Focus',
      summary: 'Summary',
      intentLabel: 'Practice',
      vocabularySuggestions: [],
    });

    await processParallelFinal('sess-1');

    const deleteCall = vi.mocked(prisma.metricSnapshot.deleteMany).mock.calls;
    for (const [args] of deleteCall) {
      const keysDeleted = (args as { where: { key: { in: string[] } } }).where.key.in;
      expect(keysDeleted).not.toContain('fillerUsage');
    }
  });

  it('does not write synthesis fillerUsage to metricSnapshot (deterministic source owns it)', async () => {
    vi.mocked(synthesizeAnalysis).mockResolvedValue({
      insights: [],
      metrics: [
        { key: 'fillerUsage', level: 'low', score: 2, note: 'LLM says low' },
        { key: 'connectorRepetition', level: 'medium', score: 6, note: 'OK' },
      ],
      focusNext: 'Focus',
      summary: 'Summary',
      intentLabel: 'Practice',
      vocabularySuggestions: [],
    });

    await processParallelFinal('sess-1');

    const createCall = vi.mocked(prisma.metricSnapshot.createMany).mock.calls;
    for (const [args] of createCall) {
      const data = (args as { data: Array<{ key: string }> }).data;
      const keys = data.map((d) => d.key);
      expect(keys).not.toContain('fillerUsage');
    }
  });

  it('calls upsertDeterministicFiller when verbatim result exists', async () => {
    vi.mocked(stitchVerbatimAndPersist).mockResolvedValue({
      rawVerbatimTranscript: 'uh hello um world',
      rawVerbatimWords: [],
      rawWordCount: 4,
      filtered: { text: 'uh hello um world', words: [], wordCount: 4, removedWordCount: 0, filterMethod: 'none' },
      divergenceSpans: [],
    });

    await processParallelFinal('sess-1');

    expect(upsertDeterministicFiller).toHaveBeenCalledWith('sess-1', 'uh hello um world');
  });

  it('does not call upsertDeterministicFiller when verbatim is null', async () => {
    vi.mocked(stitchVerbatimAndPersist).mockResolvedValue(null);

    await processParallelFinal('sess-1');

    expect(upsertDeterministicFiller).not.toHaveBeenCalled();
  });

  it('writes non-source-owned metrics normally when synthesis includes mixed keys', async () => {
    vi.mocked(synthesizeAnalysis).mockResolvedValue({
      insights: [],
      metrics: [
        { key: 'speakingRate', level: 'medium', score: 5, note: 'Azure owns this' },
        { key: 'fillerUsage', level: 'low', score: 2, note: 'Deterministic owns this' },
        { key: 'vocabularyPrecision', level: 'high', score: 8, note: 'Whisper-sourced' },
        { key: 'naturalness', level: 'medium', score: 7, note: 'Verbatim-sourced' },
      ],
      focusNext: 'Focus',
      summary: 'Summary',
      intentLabel: 'Practice',
      vocabularySuggestions: [],
    });

    await processParallelFinal('sess-1');

    const createCall = vi.mocked(prisma.metricSnapshot.createMany).mock.calls;
    expect(createCall.length).toBe(1);
    const data = (createCall[0]![0] as { data: Array<{ key: string }> }).data;
    const writtenKeys = data.map((d) => d.key);
    expect(writtenKeys).toContain('vocabularyPrecision');
    expect(writtenKeys).toContain('naturalness');
    expect(writtenKeys).not.toContain('speakingRate');
    expect(writtenKeys).not.toContain('fillerUsage');
    expect(writtenKeys).toHaveLength(2);
  });
});
