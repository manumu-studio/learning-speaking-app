// Middleware — launch mode allowlist: only /launch and /explanation are publicly accessible
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths allowed during launch mode
const ALLOWED_PATHS = [
  '/launch',
  '/explanation',
  '/api/launch/validate',
];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  const isAllowed = ALLOWED_PATHS.some((path) => pathname.startsWith(path));

  if (!isAllowed) {
    return NextResponse.redirect(new URL('/launch', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets|qr-codes|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)',
  ],
};
