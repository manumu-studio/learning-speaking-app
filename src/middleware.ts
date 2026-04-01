// API rate limiting middleware — applies Upstash Redis sliding window to all API routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRateLimiter } from '@/lib/rateLimit';

export async function middleware(request: NextRequest) {
  const rateLimiter = getRateLimiter();
  if (!rateLimiter) {
    return NextResponse.next();
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
    return NextResponse.next();
  }
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/((?!auth/).*)'],
};
