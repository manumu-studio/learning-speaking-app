// Rate limiting using Upstash Redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';
import { env } from '@/lib/env';

let rateLimiterInstance: Ratelimit | null = null;

/**
 * Returns the singleton Upstash sliding-window rate limiter, or `null` when Redis credentials are absent.
 *
 * Configured with a 60-request-per-minute sliding window under the `lsa:api` prefix.
 * Returns `null` gracefully when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are
 * not set, allowing callers to skip rate limiting in environments without Redis.
 *
 * @returns The `Ratelimit` singleton, or `null` if credentials are missing or Redis init fails.
 */
export function getRateLimiter(): Ratelimit | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!rateLimiterInstance) {
    try {
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });

      rateLimiterInstance = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'lsa:api',
      });
    } catch {
      return null;
    }
  }

  return rateLimiterInstance;
}
