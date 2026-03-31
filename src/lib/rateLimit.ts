// Rate limiting using Upstash Redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

let sessionRateLimitInstance: Ratelimit | null = null;

export function getSessionRateLimit(): Ratelimit | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!sessionRateLimitInstance) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    sessionRateLimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'lsa:session',
    });
  }

  return sessionRateLimitInstance;
}
