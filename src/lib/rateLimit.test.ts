// Tests for session rate limiter — getSessionRateLimit
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Upstash dependencies before importing the module under test
vi.mock('@upstash/ratelimit', () => {
  const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'sliding-window', limit: 5, window: '1 h' });
  const MockRatelimit = vi.fn().mockImplementation((config: unknown) => ({
    _config: config,
    limit: vi.fn(),
  }));
  (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = mockSlidingWindow;
  return { Ratelimit: MockRatelimit };
});

vi.mock('@upstash/redis', () => {
  const MockRedis = vi.fn().mockImplementation((config: unknown) => ({ _config: config }));
  return { Redis: MockRedis };
});

vi.mock('@/lib/env', () => ({
  env: {
    UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
  },
}));

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

describe('getSessionRateLimit', () => {
  beforeEach(async () => {
    // Reset module registry so the singleton resets between tests
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns null when UPSTASH_REDIS_REST_URL is missing', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: 'token' },
    }));
    const { getSessionRateLimit } = await import('@/lib/rateLimit');

    expect(getSessionRateLimit()).toBeNull();
  });

  it('returns null when UPSTASH_REDIS_REST_TOKEN is missing', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: undefined },
    }));
    const { getSessionRateLimit } = await import('@/lib/rateLimit');

    expect(getSessionRateLimit()).toBeNull();
  });

  it('returns null when both Redis credentials are missing', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
    }));
    const { getSessionRateLimit } = await import('@/lib/rateLimit');

    expect(getSessionRateLimit()).toBeNull();
  });

  it('returns a Ratelimit instance when credentials are present', async () => {
    vi.doMock('@upstash/ratelimit', () => {
      const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'sliding-window' });
      const MockRatelimit = vi.fn().mockImplementation(() => ({ limit: vi.fn() }));
      (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = mockSlidingWindow;
      return { Ratelimit: MockRatelimit };
    });
    vi.doMock('@upstash/redis', () => ({
      Redis: vi.fn().mockImplementation(() => ({})),
    }));
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'token' },
    }));

    const { getSessionRateLimit } = await import('@/lib/rateLimit');

    expect(getSessionRateLimit()).not.toBeNull();
  });

  it('creates Ratelimit with sliding window of 5 requests per 1 hour', async () => {
    const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'sliding-window' });
    const MockRatelimit = vi.fn().mockImplementation(() => ({ limit: vi.fn() }));
    (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = mockSlidingWindow;

    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: MockRatelimit }));
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn().mockImplementation(() => ({})) }));
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'token' },
    }));

    const { getSessionRateLimit } = await import('@/lib/rateLimit');
    getSessionRateLimit();

    expect(mockSlidingWindow).toHaveBeenCalledWith(5, '1 h');
  });

  it('creates Ratelimit with prefix lsa:session', async () => {
    const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'sliding-window' });
    const MockRatelimit = vi.fn().mockImplementation(() => ({ limit: vi.fn() }));
    (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = mockSlidingWindow;

    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: MockRatelimit }));
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn().mockImplementation(() => ({})) }));
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'token' },
    }));

    const { getSessionRateLimit } = await import('@/lib/rateLimit');
    getSessionRateLimit();

    expect(MockRatelimit).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'lsa:session' })
    );
  });

  it('initialises Redis with the configured URL and token', async () => {
    const MockRedis = vi.fn().mockImplementation(() => ({}));
    const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'sliding-window' });
    const MockRatelimit = vi.fn().mockImplementation(() => ({ limit: vi.fn() }));
    (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = mockSlidingWindow;

    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: MockRatelimit }));
    vi.doMock('@upstash/redis', () => ({ Redis: MockRedis }));
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: 'https://my-redis.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'secret' },
    }));

    const { getSessionRateLimit } = await import('@/lib/rateLimit');
    getSessionRateLimit();

    expect(MockRedis).toHaveBeenCalledWith({
      url: 'https://my-redis.upstash.io',
      token: 'secret',
    });
  });

  it('returns the same instance on subsequent calls (singleton)', async () => {
    const MockRatelimit = vi.fn().mockImplementation(() => ({ limit: vi.fn() }));
    (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = vi.fn().mockReturnValue({});

    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: MockRatelimit }));
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn().mockImplementation(() => ({})) }));
    vi.doMock('@/lib/env', () => ({
      env: { UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'token' },
    }));

    const { getSessionRateLimit } = await import('@/lib/rateLimit');

    const first = getSessionRateLimit();
    const second = getSessionRateLimit();

    expect(first).toBe(second);
    // Ratelimit constructor called only once despite two getSessionRateLimit() calls
    expect(MockRatelimit).toHaveBeenCalledTimes(1);
  });
});