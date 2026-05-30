// Tests for chunk feature extraction via Praat microservice
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sessionChunk: { findMany: vi.fn().mockResolvedValue([]) },
    chunkFeature: { upsert: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/praat', () => ({
  extractContour: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/storage/r2', () => ({
  generatePresignedGetUrl: vi.fn().mockResolvedValue('https://r2.example.com/signed'),
}));

describe('extractChunkFeatures', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns early when PRAAT_SERVICE_URL is not configured', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { PRAAT_SERVICE_URL: undefined, PRAAT_API_KEY: undefined },
    }));

    const { extractChunkFeatures } = await import('@/lib/pipeline/extractFeatures');
    await expect(extractChunkFeatures('s1', 0, 'key', 30, 1.5)).resolves.toBeUndefined();
  });

  it('returns early when contour extraction returns null', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { PRAAT_SERVICE_URL: 'https://praat.test', PRAAT_API_KEY: 'key' },
    }));

    const { extractChunkFeatures } = await import('@/lib/pipeline/extractFeatures');
    await expect(extractChunkFeatures('s1', 0, 'key', 30, 1.5)).resolves.toBeUndefined();
  });

  it('persists ChunkFeature when contour data is returned', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { PRAAT_SERVICE_URL: 'https://praat.test', PRAAT_API_KEY: 'key' },
    }));

    vi.doMock('@/lib/praat', () => ({
      extractContour: vi.fn().mockResolvedValue({
        frameMs: 10,
        f0Hz: [120],
        intensityDb: [60],
        voiced: [true],
        durationMs: 10,
      }),
    }));

    const { prisma } = await import('@/lib/prisma');
    const { extractChunkFeatures } = await import('@/lib/pipeline/extractFeatures');
    await extractChunkFeatures('s1', 0, 'audio/key.wav', 30, 1.5);

    expect(prisma.chunkFeature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_chunkIndex: { sessionId: 's1', chunkIndex: 0 } },
      }),
    );
  });
});
