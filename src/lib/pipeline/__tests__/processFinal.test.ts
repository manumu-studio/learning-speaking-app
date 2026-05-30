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
    transcript: {
      upsert: vi.fn(),
    },
    insight: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    metricSnapshot: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ai/analyze', () => ({
  analyzeTranscript: vi.fn(),
}));

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

vi.mock('@/features/session/updatePatternProfile', () => ({
  updatePatternProfile: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { processFinal } from '@/lib/pipeline/processFinal';

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
});
