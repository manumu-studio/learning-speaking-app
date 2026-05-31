// Integration tests for processChunkIndependent with mocked AI and storage
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    AZURE_SPEECH_KEY: 'test-key',
    AZURE_SPEECH_REGION: 'eastus',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    chunkResult: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    speakingSession: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock('@/lib/storage/r2', () => ({
  getAudio: vi.fn(),
  deleteAudio: vi.fn(),
}));

vi.mock('@/lib/ai/whisper', () => ({
  transcribeWavChunk: vi.fn(),
}));

vi.mock('@/lib/ai/azurePronunciation', () => ({
  assessPronunciation: vi.fn(),
}));

vi.mock('@/lib/ai/l1Spanish', () => ({
  tagSpanishL1: vi.fn((words: unknown[]) => words),
}));

vi.mock('@/lib/ai/analyze', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/analyze')>();
  return {
    ...actual,
    analyzeTranscript: vi.fn(),
  };
});

import { prisma } from '@/lib/prisma';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { transcribeWavChunk } from '@/lib/ai/whisper';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { processChunkIndependent } from '../processChunkIndependent';

const mockPrisma = vi.mocked(prisma);
const mockGetAudio = vi.mocked(getAudio);
const mockDeleteAudio = vi.mocked(deleteAudio);
const mockTranscribe = vi.mocked(transcribeWavChunk);
const mockPronunciation = vi.mocked(assessPronunciation);
const mockAnalyze = vi.mocked(analyzeTranscript);

const baseInput = {
  sessionId: 'sess-1',
  chunkIndex: 0,
  storageKey: 'audio/sess-1/chunk-0.wav',
  durationSecs: 125,
  overlapSecs: 5,
};

const audioBuffer = Buffer.from('fake-wav');

function setupHappyPath() {
  mockGetAudio.mockResolvedValue(audioBuffer);
  mockTranscribe.mockResolvedValue({
    text: 'Hello world this is a test',
    words: [{ word: 'Hello', start: 0, end: 0.5 }],
    segments: [],
    language: 'en',
  } as Awaited<ReturnType<typeof transcribeWavChunk>>);
  mockPronunciation.mockResolvedValue({
    pronScore: 85,
    accuracyScore: 82,
    fluencyScore: 88,
    completenessScore: 90,
    prosodyScore: 80,
    words: [{ word: 'Hello', accuracyScore: 90, errorType: 'None', offsetMs: 0, durationMs: 500, phonemes: [] }],
    rawUtterances: [],
  } as Awaited<ReturnType<typeof assessPronunciation>>);
  mockAnalyze.mockResolvedValue({
    insights: [{ category: 'grammar' as const, pattern: 'Test', detail: 'test detail', frequency: 1, severity: 'low' as const, examples: [] }],
    metrics: [],
    focusNext: 'Keep going',
    summary: 'Good job',
    intentLabel: 'Test session',
  } as Awaited<ReturnType<typeof analyzeTranscript>>);
  vi.mocked(prisma.chunkResult.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.chunkResult.update).mockResolvedValue({} as never);
  vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
    focusMetricKey: null,
    promptUsed: null,
  } as never);
  mockDeleteAudio.mockResolvedValue(undefined);
}

describe('processChunkIndependent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs full pipeline: upsert → transcribe → pronunciation → analyze → update DONE → delete audio', async () => {
    setupHappyPath();

    await processChunkIndependent(baseInput);

    expect(mockPrisma.chunkResult.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_chunkIndex: { sessionId: 'sess-1', chunkIndex: 0 } },
        create: expect.objectContaining({ status: 'PROCESSING' }),
      }),
    );
    expect(mockGetAudio).toHaveBeenCalledWith('audio/sess-1/chunk-0.wav');
    expect(mockTranscribe).toHaveBeenCalled();
    expect(mockPronunciation).toHaveBeenCalled();
    expect(mockAnalyze).toHaveBeenCalled();
    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DONE' }),
      }),
    );
    expect(mockDeleteAudio).toHaveBeenCalledWith('audio/sess-1/chunk-0.wav');
  });

  it('marks chunk FAILED and rethrows when Whisper transcription fails', async () => {
    setupHappyPath();
    mockTranscribe.mockRejectedValue(new Error('Whisper timeout'));

    await expect(processChunkIndependent(baseInput)).rejects.toThrow('Whisper timeout');

    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED' },
      }),
    );
  });

  it('continues without pronunciation when Azure assessment fails', async () => {
    setupHappyPath();
    mockPronunciation.mockRejectedValue(new Error('Azure down'));

    await processChunkIndependent(baseInput);

    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DONE',
          pronunciationReport: Prisma.JsonNull,
        }),
      }),
    );
  });

  it('continues without insights when Claude analysis fails', async () => {
    setupHappyPath();
    mockAnalyze.mockRejectedValue(new Error('Claude rate limited'));

    await processChunkIndependent(baseInput);

    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DONE',
          insights: Prisma.JsonNull,
        }),
      }),
    );
  });

  it('skips pronunciation when Azure env vars are missing', async () => {
    setupHappyPath();

    const envMock = await import('@/lib/env');
    const originalKey = envMock.env.AZURE_SPEECH_KEY;
    Object.defineProperty(envMock.env, 'AZURE_SPEECH_KEY', { value: undefined, writable: true, configurable: true });

    await processChunkIndependent(baseInput);

    expect(mockPronunciation).not.toHaveBeenCalled();
    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DONE' }),
      }),
    );

    Object.defineProperty(envMock.env, 'AZURE_SPEECH_KEY', { value: originalKey, writable: true, configurable: true });
  });

  it('still marks DONE when R2 audio delete fails', async () => {
    setupHappyPath();
    mockDeleteAudio.mockRejectedValue(new Error('R2 network error'));

    await processChunkIndependent(baseInput);

    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DONE' }),
      }),
    );
  });

  it('stores transcript text and word count from Whisper', async () => {
    setupHappyPath();
    mockTranscribe.mockResolvedValue({
      text: '  one two three  ',
      words: [],
      segments: [],
      language: 'en',
    } as Awaited<ReturnType<typeof transcribeWavChunk>>);

    await processChunkIndependent(baseInput);

    expect(mockPrisma.chunkResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transcriptText: 'one two three',
          wordCount: 3,
        }),
      }),
    );
  });
});
