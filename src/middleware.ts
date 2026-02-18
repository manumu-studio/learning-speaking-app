// Middleware for protecting authenticated routes
import { auth } from '@/features/auth/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAuthenticated = !!req.auth;

  // Define protected route patterns
  const protectedPatterns = [
    '/session',
    '/history',
    '/profile',
    '/settings',
  ];

  const isProtectedRoute = protectedPatterns.some((pattern) =>
    req.nextUrl.pathname.startsWith(pattern)
  );

  // Redirect to sign-in if accessing protected route without auth
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/session/:path*',
    '/history/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
};
