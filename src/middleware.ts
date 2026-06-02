// API rate limiting + security headers (CSP, framing, permissions) for matched routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRateLimiter } from '@/lib/rateLimit';
import { env } from '@/lib/env';
import { resolveRateLimitIdentifier, checkRateLimit } from '@/middlewareHelpers';

// CSP with auth URL from environment
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self' ${env.AUTH_ISSUER_URL} https://qstash.upstash.io https://*.ingest.sentry.io https://*.r2.cloudflarestorage.com`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ');

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', CSP_HEADER);
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=()',
  );
  return response;
}

function nextWithPathname(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return applySecurityHeaders(response);
}

/** Returns true when the pathname is an API route subject to rate-limiting. */
function isRateLimitedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    !pathname.startsWith('/api/health')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.E2E_TEST_USER === 'true' && process.env.NODE_ENV !== 'production') {
    return nextWithPathname(request);
  }

  if (!isRateLimitedPath(pathname)) {
    return nextWithPathname(request);
  }

  const rateLimiter = getRateLimiter();
  if (!rateLimiter) {
    return nextWithPathname(request);
  }

  const identifier = resolveRateLimitIdentifier(request);
  const allowed = await checkRateLimit(rateLimiter, identifier);

  if (!allowed) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMITED' },
        { status: 429 },
      ),
    );
  }

  return nextWithPathname(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
