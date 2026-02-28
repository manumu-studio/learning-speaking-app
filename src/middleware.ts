// Middleware — launch mode allowlist controlled by LAUNCH_MODE env
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths allowed during launch mode
const ALLOWED_PATHS = [
  '/launch',
  '/explanation',
  '/api/launch/validate',
  '/api/internal',          // QStash webhooks must bypass launch mode
  '/api/dev',               // Dev-only pipeline routes (self-guarded by NODE_ENV check)
];

export function middleware(req: NextRequest): NextResponse {
  // Launch lock is opt-in: set LAUNCH_MODE=true to enforce allowlist.
  // In normal mode, app route protection is handled by server auth checks in (app)/layout.tsx.
  const isLaunchMode = process.env.LAUNCH_MODE === 'true';
  if (!isLaunchMode) {
    return NextResponse.next();
  }

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
