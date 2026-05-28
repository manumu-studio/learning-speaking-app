// API rate limiting + security headers (CSP, framing, permissions) for matched routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRateLimiter } from '@/lib/rateLimit';
import { env } from '@/lib/env';

// CSP with auth URL from environment
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self' ${env.AUTH_ISSUER_URL} https://qstash.upstash.io https://*.ingest.sentry.io`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ');

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', CSP_HEADER);
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isRateLimitedApi =
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    !pathname.startsWith('/api/health');

  if (process.env.E2E_TEST_USER === 'true' && process.env.NODE_ENV !== 'production') {
    return nextWithPathname(request);
  }

  if (!isRateLimitedApi) {
    return nextWithPathname(request);
  }

  const rateLimiter = getRateLimiter();
  if (!rateLimiter) {
    return nextWithPathname(request);
  }

  const token =
    request.cookies.get('authjs.session-token')?.value ??
    request.cookies.get('__Secure-authjs.session-token')?.value;

  let identifier: string;
  if (token) {
    identifier = `user:${token.slice(-16)}`;
  } else {
    identifier = `ip:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}`;
  }

  let success = true;
  try {
    ({ success } = await rateLimiter.limit(identifier));
  } catch {
    return nextWithPathname(request);
  }
  if (!success) {
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
