// Tests for getRateLimiter — returns null when Redis env vars absent, returns singleton otherwise
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Top-level mocks so Vitest hoisting picks them up correctly.
// We use a mutable object for env so individual tests can change the values.
const mockEnv: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string } = {
  UPSTASH_REDIS_REST_URL: undefined,
  UPSTASH_REDIS_REST_TOKEN: undefined,
};

vi.mock('@/lib/env', () => ({ get env() { return mockEnv; } }));

const mockRedisConstructor = vi.fn().mockImplementation(() => ({ __type: 'MockRedis' }));
vi.mock('@upstash/redis/cloudflare', () => ({ Redis: mockRedisConstructor }));

const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'slidingWindow' });
const MockRatelimit = vi.fn().mockImplementation((opts: { prefix?: string }) => ({
  __type: 'MockRatelimit',
  prefix: opts.prefix,
}));
(MockRatelimit as unknown as { slidingWindow: typeof mockSlidingWindow }).slidingWindow =
  mockSlidingWindow;
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: MockRatelimit }));

describe('getRateLimiter', () => {
  beforeEach(() => {
    // Reset the module so the singleton is cleared between tests
    vi.resetModules();
    // Reset mock call records
    mockRedisConstructor.mockClear();
    MockRatelimit.mockClear();
  });

  it('returns null when UPSTASH_REDIS_REST_URL is absent', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = undefined;
    mockEnv.UPSTASH_REDIS_REST_TOKEN = 'some-token';
    const { getRateLimiter } = await import('./rateLimit');
    expect(getRateLimiter()).toBeNull();
  });

  it('returns null when UPSTASH_REDIS_REST_TOKEN is absent', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    mockEnv.UPSTASH_REDIS_REST_TOKEN = undefined;
    const { getRateLimiter } = await import('./rateLimit');
    expect(getRateLimiter()).toBeNull();
  });

  it('returns null when both UPSTASH env vars are absent', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = undefined;
    mockEnv.UPSTASH_REDIS_REST_TOKEN = undefined;
    const { getRateLimiter } = await import('./rateLimit');
    expect(getRateLimiter()).toBeNull();
  });

  it('returns a Ratelimit instance when both env vars are present', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    mockEnv.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const { getRateLimiter } = await import('./rateLimit');
    expect(getRateLimiter()).not.toBeNull();
  });

  it('uses the lsa:api prefix', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    mockEnv.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const { getRateLimiter } = await import('./rateLimit');
    const limiter = getRateLimiter() as unknown as { prefix: string };
    expect(limiter.prefix).toBe('lsa:api');
  });

  it('returns the same instance on repeated calls (singleton)', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    mockEnv.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const { getRateLimiter } = await import('./rateLimit');
    expect(getRateLimiter()).toBe(getRateLimiter());
  });

  it('constructs Redis with the env url and token', async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    mockEnv.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const { getRateLimiter } = await import('./rateLimit');
    getRateLimiter();
    expect(mockRedisConstructor).toHaveBeenCalledWith({
      url: 'https://redis.example.com',
      token: 'test-token',
    });
  });
});