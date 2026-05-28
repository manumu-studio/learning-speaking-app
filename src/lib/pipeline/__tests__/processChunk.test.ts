// Integration-style tests for processChunk with mocked AI and storage dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkStatus, SessionStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sessionChunk: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    speakingSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

vi.mock('@/lib/queue/qstash', () => ({
  enqueueFinalProcessing: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { transcribeWavChunk } from '@/lib/ai/whisper';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { enqueueFinalProcessing } from '@/lib/queue/qstash';
import { processChunk } from '@/lib/pipeline/processChunk';

describe('processChunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAudio).mockResolvedValue(Buffer.from('wav'));
    vi.mocked(deleteAudio).mockResolvedValue(undefined);
    vi.mocked(transcribeWavChunk).mockResolvedValue({
      text: 'hello world',
      language: 'en',
      segments: [],
      words: [{ word: 'hello', start: 0, end: 0.5 }],
    });
    vi.mocked(assessPronunciation).mockResolvedValue({
      pronScore: 80,
      accuracyScore: 80,
      fluencyScore: 75,
      completenessScore: 85,
      prosodyScore: 70,
      words: [],
      rawUtterances: [],
    });
    vi.mocked(prisma.sessionChunk.count).mockResolvedValue(1);
  });

  it('marks a chunk done after transcription and scoring', async () => {
    vi.mocked(prisma.sessionChunk.findUnique).mockResolvedValue({
      id: 'chunk-1',
      sessionId: 'session-1',
      chunkIndex: 0,
      status: ChunkStatus.UPLOADED,
      audioUrl: 'sessions/user/session/chunks/0.wav',
      overlapSecs: 0,
      session: {
        id: 'session-1',
        userId: 'user-1',
        status: 'UPLOADED',
        isChunked: true,
      },
    } as never);

    await processChunk('session-1', 0);

    expect(transcribeWavChunk).toHaveBeenCalled();
    expect(deleteAudio).toHaveBeenCalled();
    expect(prisma.sessionChunk.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'chunk-1' },
        data: expect.objectContaining({ status: ChunkStatus.CHUNK_DONE }),
      }),
    );
  });

  it('enqueues final processing when all chunks are done', async () => {
    vi.mocked(prisma.sessionChunk.findUnique).mockResolvedValue({
      id: 'chunk-1',
      sessionId: 'session-1',
      chunkIndex: 0,
      status: ChunkStatus.UPLOADED,
      audioUrl: 'sessions/user/session/chunks/0.wav',
      overlapSecs: 0,
      session: {
        id: 'session-1',
        userId: 'user-1',
        status: 'CHUNKS_PROCESSING',
        isChunked: true,
      },
    } as never);

    vi.mocked(prisma.speakingSession.update).mockResolvedValue({} as never);
    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      chunkCount: 1,
      isChunked: true,
      status: SessionStatus.CHUNKS_PROCESSING,
    } as never);
    vi.mocked(prisma.sessionChunk.count).mockResolvedValue(1);

    await processChunk('session-1', 0);

    expect(enqueueFinalProcessing).toHaveBeenCalledWith('session-1');
  });

  it('throws when chunk is not found', async () => {
    vi.mocked(prisma.sessionChunk.findUnique).mockResolvedValue(null);

    await expect(processChunk('session-1', 0)).rejects.toThrow('Chunk not found');
  });

  it('throws when chunk exists but audioUrl is null', async () => {
    vi.mocked(prisma.sessionChunk.findUnique).mockResolvedValue({
      id: 'chunk-1',
      sessionId: 'session-1',
      chunkIndex: 0,
      status: ChunkStatus.UPLOADED,
      audioUrl: null,
      overlapSecs: 0,
      session: {
        id: 'session-1',
        userId: 'user-1',
        status: 'UPLOADED',
        isChunked: true,
      },
    } as never);

    await expect(processChunk('session-1', 0)).rejects.toThrow('Chunk missing audio URL');
  });

  it('skips transcription and calls maybeEnqueueFinalProcessing when chunk is already CHUNK_DONE', async () => {
    vi.mocked(prisma.sessionChunk.findUnique).mockResolvedValue({
      id: 'chunk-1',
      sessionId: 'session-1',
      chunkIndex: 0,
      status: ChunkStatus.CHUNK_DONE,
      audioUrl: 'sessions/user/session/chunks/0.wav',
      overlapSecs: 0,
      session: {
        id: 'session-1',
        userId: 'user-1',
        status: 'CHUNKS_PROCESSING',
        isChunked: true,
      },
    } as never);

    vi.mocked(prisma.speakingSession.findUnique).mockResolvedValue({
      chunkCount: 1,
      isChunked: true,
      status: SessionStatus.CHUNKS_PROCESSING,
    } as never);
    vi.mocked(prisma.sessionChunk.count).mockResolvedValue(1);
    vi.mocked(prisma.speakingSession.update).mockResolvedValue({} as never);

    await processChunk('session-1', 0);

    expect(transcribeWavChunk).not.toHaveBeenCalled();
    expect(enqueueFinalProcessing).toHaveBeenCalledWith('session-1');
  });
});
