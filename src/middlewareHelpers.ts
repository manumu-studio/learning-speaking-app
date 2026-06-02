// Helpers extracted from middleware.ts to satisfy complexity budget
import type { NextRequest } from 'next/server';
import type { Ratelimit } from '@upstash/ratelimit';

/** Resolves a stable rate-limit identifier from session token or IP. */
export function resolveRateLimitIdentifier(request: NextRequest): string {
  const token =
    request.cookies.get('authjs.session-token')?.value ??
    request.cookies.get('__Secure-authjs.session-token')?.value;

  if (token) {
    return `user:${token.slice(-16)}`;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `ip:${ip}`;
}

/** Returns false when rate-limited; true on success or limiter error (fail-open). */
export async function checkRateLimit(
  rateLimiter: Ratelimit,
  identifier: string,
): Promise<boolean> {
  try {
    const { success } = await rateLimiter.limit(identifier);
    return success;
  } catch {
    return true; // fail-open: treat limiter errors as allowed
  }
}
