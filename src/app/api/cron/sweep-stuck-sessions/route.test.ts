// Tests for stuck session cron sweeper endpoint
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkStatus, SessionStatus } from '@prisma/client';

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/pipeline/processChunk', () => ({
  maybeEnqueueFinalProcessing: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    speakingSession: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { maybeEnqueueFinalProcessing } from '@/lib/pipeline/processChunk';

const staleDate = new Date('2020-01-01T00:00:00.000Z');

function authorizedRequest(): Request {
  return new Request('http://localhost/api/cron/sweep-stuck-sessions', {
    method: 'GET',
    headers: { authorization: 'Bearer cron-secret' },
  });
}

describe('GET /api/cron/sweep-stuck-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.speakingSession.update).mockResolvedValue({} as never);
    vi.mocked(maybeEnqueueFinalProcessing).mockResolvedValue(undefined);
  });

  it('returns 401 without cron authorization', async () => {
    const response = await GET(new Request('http://localhost/api/cron/sweep-stuck-sessions') as never);
    expect(response.status).toBe(401);
  });

  it('marks sessions with failed chunks as FAILED', async () => {
    vi.mocked(prisma.speakingSession.findMany).mockResolvedValue([
      {
        id: 'session-failed-chunk',
        status: SessionStatus.CHUNKS_PROCESSING,
        chunkCount: 2,
        chunks: [
          { status: ChunkStatus.CHUNK_DONE, updatedAt: staleDate },
          { status: ChunkStatus.FAILED, updatedAt: staleDate },
        ],
      },
    ] as never);

    const response = await GET(authorizedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.markedFailed).toBe(1);
    expect(prisma.speakingSession.update).toHaveBeenCalledWith({
      where: { id: 'session-failed-chunk' },
      data: {
        status: SessionStatus.FAILED,
        errorMessage: 'One or more audio segments failed to process',
      },
    });
  });

  it('re-enqueues final processing when all chunks are done but session is stuck', async () => {
    vi.mocked(prisma.speakingSession.findMany).mockResolvedValue([
      {
        id: 'session-stuck-final',
        status: SessionStatus.PROCESSING_FINAL,
        chunkCount: 2,
        chunks: [
          { status: ChunkStatus.CHUNK_DONE, updatedAt: staleDate },
          { status: ChunkStatus.CHUNK_DONE, updatedAt: staleDate },
        ],
      },
    ] as never);

    const response = await GET(authorizedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redriven).toBe(1);
    expect(maybeEnqueueFinalProcessing).toHaveBeenCalledWith('session-stuck-final');
  });

  it('marks UPLOADED/CHUNKS_PROCESSING sessions as FAILED when chunks are stale and incomplete', async () => {
    vi.mocked(prisma.speakingSession.findMany).mockResolvedValue([
      {
        id: 'session-timed-out',
        status: SessionStatus.CHUNKS_PROCESSING,
        chunkCount: 3,
        chunks: [
          { status: ChunkStatus.CHUNK_DONE, updatedAt: staleDate },
          { status: ChunkStatus.TRANSCRIBING, updatedAt: staleDate },
          { status: ChunkStatus.UPLOADED, updatedAt: staleDate },
        ],
      },
    ] as never);

    const response = await GET(authorizedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.markedFailed).toBe(1);
    expect(prisma.speakingSession.update).toHaveBeenCalledWith({
      where: { id: 'session-timed-out' },
      data: {
        status: SessionStatus.FAILED,
        errorMessage: 'Session processing timed out',
      },
    });
    expect(maybeEnqueueFinalProcessing).not.toHaveBeenCalled();
  });

  it('skips sessions with recently updated chunks', async () => {
    vi.mocked(prisma.speakingSession.findMany).mockResolvedValue([
      {
        id: 'session-active',
        status: SessionStatus.CHUNKS_PROCESSING,
        chunkCount: 2,
        chunks: [
          { status: ChunkStatus.CHUNK_DONE, updatedAt: staleDate },
          { status: ChunkStatus.TRANSCRIBING, updatedAt: new Date() },
        ],
      },
    ] as never);

    const response = await GET(authorizedRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.skipped).toBe(1);
    expect(maybeEnqueueFinalProcessing).not.toHaveBeenCalled();
    expect(prisma.speakingSession.update).not.toHaveBeenCalled();
  });
});
