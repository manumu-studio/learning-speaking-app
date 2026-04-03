// Tests for rate limiter factory — no Redis config yields null
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getRateLimiter', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns null when Upstash Redis env vars are missing', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined,
      },
    }));
    const { getRateLimiter } = await import('./rateLimit');
    expect(getRateLimiter()).toBeNull();
  });
});
