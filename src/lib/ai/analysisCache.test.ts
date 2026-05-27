// Unit tests for Redis-backed analysis result cache
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGet, mockSet, MockRedis } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const MockRedis = vi.fn(() => ({
    get: mockGet,
    set: mockSet,
  }));
  return { mockGet, mockSet, MockRedis };
});

vi.mock('@upstash/redis', () => ({
  Redis: MockRedis,
}));

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    NODE_ENV: 'test',
  },
}));

import { hashTranscript } from './analysisCache';

describe('hashTranscript', () => {
  it('returns the same hash for the same input', () => {
    expect(hashTranscript('hello world')).toBe(hashTranscript('hello world'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashTranscript('hello')).not.toBe(hashTranscript('world'));
  });

  it('returns a 64-character SHA-256 hex string', () => {
    const hash = hashTranscript('test transcript');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('getCachedAnalysis', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockGet.mockReset();
    MockRedis.mockClear();
  });

  it('returns null when Redis env vars are absent', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined,
      },
    }));

    const { getCachedAnalysis } = await import('./analysisCache');
    await expect(getCachedAnalysis('abc123')).resolves.toBeNull();
  });

  it('returns null on cache miss', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      },
    }));
    mockGet.mockResolvedValue(null);

    const { getCachedAnalysis } = await import('./analysisCache');
    await expect(getCachedAnalysis('abc123')).resolves.toBeNull();
  });

  it('returns the result field on cache hit with valid data', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      },
    }));

    const cachedResult = {
      insights: [],
      metrics: [],
      focusNext: 'Practice connectors.',
      summary: 'Good effort.',
      intentLabel: 'Daily chat',
    };

    mockGet.mockResolvedValue(
      JSON.stringify({
        result: cachedResult,
        cachedAt: '2026-05-27T12:00:00.000Z',
      }),
    );

    const { getCachedAnalysis } = await import('./analysisCache');
    await expect(getCachedAnalysis('abc123')).resolves.toEqual(cachedResult);
  });

  it('returns null when cached data fails Zod validation', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      },
    }));

    mockGet.mockResolvedValue(
      JSON.stringify({
        result: { insights: [] },
        cachedAt: '2026-05-27T12:00:00.000Z',
      }),
    );

    const { getCachedAnalysis } = await import('./analysisCache');
    await expect(getCachedAnalysis('abc123')).resolves.toBeNull();
  });
});

describe('setCachedAnalysis', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockSet.mockReset();
    MockRedis.mockClear();
  });

  const sampleResult = {
    insights: [],
    metrics: [],
    focusNext: 'Practice connectors.',
    summary: 'Good effort.',
    intentLabel: 'Daily chat',
  };

  it('does not throw when Redis env vars are absent', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined,
      },
    }));

    const { setCachedAnalysis } = await import('./analysisCache');
    await expect(setCachedAnalysis('abc123', sampleResult)).resolves.toBeUndefined();
  });

  it('does not rethrow when Redis set fails', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      },
    }));
    mockSet.mockRejectedValue(new Error('Redis unavailable'));

    const { setCachedAnalysis } = await import('./analysisCache');
    await expect(setCachedAnalysis('abc123', sampleResult)).resolves.toBeUndefined();
  });

  it('writes to Redis with versioned key and 7-day TTL', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      },
    }));
    mockSet.mockResolvedValue('OK');

    const { setCachedAnalysis } = await import('./analysisCache');
    await setCachedAnalysis('deadbeef', sampleResult);

    expect(mockSet).toHaveBeenCalledWith(
      'lsa:analysis:v1:deadbeef',
      expect.stringContaining('"focusNext":"Practice connectors."'),
      { ex: 604800 },
    );
  });
});
