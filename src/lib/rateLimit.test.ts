// Tests for rateLimit — covers getRateLimiter singleton creation, missing-credentials guard, and init failure
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

// Helper: load a fresh module with given env vars and Redis/Ratelimit behaviours
async function loadModule({
  url,
  token,
  redisThrows = false,
  ratelimitThrows = false,
}: {
  url?: string;
  token?: string;
  redisThrows?: boolean;
  ratelimitThrows?: boolean;
}) {
  vi.doMock('@/lib/env', () => ({
    env: {
      UPSTASH_REDIS_REST_URL: url,
      UPSTASH_REDIS_REST_TOKEN: token,
      NODE_ENV: 'test',
    },
  }));

  vi.doMock('@upstash/redis/cloudflare', () => ({
    Redis: redisThrows
      ? vi.fn().mockImplementation(() => { throw new Error('Redis init failed'); })
      : vi.fn().mockImplementation(() => ({ ping: vi.fn() })),
  }));

  const mockSlidingWindow = vi.fn().mockReturnValue({ type: 'sliding-window' });
  const mockInstance = { limit: vi.fn() };

  vi.doMock('@upstash/ratelimit', () => ({
    Ratelimit: Object.assign(
      ratelimitThrows
        ? vi.fn().mockImplementation(() => { throw new Error('Ratelimit init failed'); })
        : vi.fn().mockImplementation(() => mockInstance),
      { slidingWindow: mockSlidingWindow },
    ),
  }));

  const mod = await import('@/lib/rateLimit');
  return { mod, mockInstance, mockSlidingWindow };
}

describe('getRateLimiter', () => {
  it('returns null when UPSTASH_REDIS_REST_URL is missing', async () => {
    const { mod } = await loadModule({ token: 'tok' });
    expect(mod.getRateLimiter()).toBeNull();
  });

  it('returns null when UPSTASH_REDIS_REST_TOKEN is missing', async () => {
    const { mod } = await loadModule({ url: 'https://redis.example.com' });
    expect(mod.getRateLimiter()).toBeNull();
  });

  it('returns null when both credentials are missing', async () => {
    const { mod } = await loadModule({});
    expect(mod.getRateLimiter()).toBeNull();
  });

  it('creates and returns a Ratelimit instance when credentials are present', async () => {
    const { mod, mockInstance } = await loadModule({
      url: 'https://redis.example.com',
      token: 'secret-token',
    });

    const limiter = mod.getRateLimiter();
    expect(limiter).toBe(mockInstance);
  });

  it('constructs Redis with correct url and token', async () => {
    await loadModule({
      url: 'https://redis.example.com',
      token: 'my-token',
    });

    const { Redis } = await import('@upstash/redis/cloudflare');
    // getRateLimiter was already called during import resolution — reload to check call args
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'my-token',
        NODE_ENV: 'test',
      },
    }));
    const RedisMock = vi.fn().mockImplementation(() => ({ ping: vi.fn() }));
    const slidingWindowMock = vi.fn().mockReturnValue({ type: 'sliding-window' });
    vi.doMock('@upstash/redis/cloudflare', () => ({ Redis: RedisMock }));
    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: Object.assign(
        vi.fn().mockImplementation(() => ({ limit: vi.fn() })),
        { slidingWindow: slidingWindowMock },
      ),
    }));
    const fresh = await import('@/lib/rateLimit');
    fresh.getRateLimiter();

    expect(RedisMock).toHaveBeenCalledWith({
      url: 'https://redis.example.com',
      token: 'my-token',
    });
    // Unused import suppression
    void Redis;
  });

  it('calls Ratelimit with slidingWindow(60, "1 m") and prefix lsa:api', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'tok',
        NODE_ENV: 'test',
      },
    }));
    vi.doMock('@upstash/redis/cloudflare', () => ({
      Redis: vi.fn().mockImplementation(() => ({})),
    }));
    const RatelimitMock = vi.fn().mockImplementation(() => ({ limit: vi.fn() }));
    const slidingWindowMock = vi.fn().mockReturnValue({ type: 'sliding-window' });
    Object.assign(RatelimitMock, { slidingWindow: slidingWindowMock });
    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: RatelimitMock }));

    const { getRateLimiter } = await import('@/lib/rateLimit');
    getRateLimiter();

    expect(slidingWindowMock).toHaveBeenCalledWith(60, '1 m');
    expect(RatelimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'lsa:api' }),
    );
  });

  it('returns the same singleton on repeated calls', async () => {
    const { mod, mockInstance } = await loadModule({
      url: 'https://redis.example.com',
      token: 'tok',
    });

    const first = mod.getRateLimiter();
    const second = mod.getRateLimiter();

    expect(first).toBe(second);
    expect(first).toBe(mockInstance);
  });

  it('returns null when Redis constructor throws', async () => {
    const { mod } = await loadModule({
      url: 'https://redis.example.com',
      token: 'tok',
      redisThrows: true,
    });
    expect(mod.getRateLimiter()).toBeNull();
  });

  it('returns null when Ratelimit constructor throws', async () => {
    const { mod } = await loadModule({
      url: 'https://redis.example.com',
      token: 'tok',
      ratelimitThrows: true,
    });
    expect(mod.getRateLimiter()).toBeNull();
  });
});
