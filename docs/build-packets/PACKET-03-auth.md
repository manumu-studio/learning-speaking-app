# PACKET-03 — Authentication with OIDC

**Branch:** `feature/auth-integration`
**Version:** `0.3.0`
**Prerequisites:** PACKET-01 and PACKET-02 completed successfully

---

## Overview

Integrate external OIDC authentication using auth.manumustudio.com with NextAuth v5 (next-auth beta). This includes OAuth flow, JWT sessions, middleware-based route protection, and automatic user synchronization with the local database.

---

## Prerequisites Checklist

Before starting this packet, ensure:

- [ ] OAuth client registered on `auth.manumustudio.com` with:
  - **Redirect URI:** `http://localhost:3000/api/auth/callback/manumustudio`
  - **Scopes:** `openid email profile`
- [ ] Client ID and Client Secret available
- [ ] `.env.local` file created with required environment variables

Example `.env.local`:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-32-character-secret-here"
NEXTAUTH_URL="http://localhost:3000"
AUTH_CLIENT_ID="your-client-id"
AUTH_CLIENT_SECRET="your-client-secret"
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

---

## What to Build

### 1. Install NextAuth v5 (Beta)

```bash
npm install next-auth@beta
```

---

### 2. Create NextAuth Configuration

Create `src/features/auth/auth.ts`:

```typescript
// NextAuth configuration with ManuMuStudio OIDC provider
import NextAuth from 'next-auth';
import { env } from '@/lib/env';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: 'manumustudio',
      name: 'ManuMuStudio',
      type: 'oidc',
      issuer: 'https://auth.manumustudio.com',
      clientId: env.AUTH_CLIENT_ID,
      clientSecret: env.AUTH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
      checks: ['pkce', 'state'],
    },
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      // On first sign-in, add external ID and user info to token
      if (profile?.sub) {
        token.externalId = profile.sub as string;
        token.email = profile.email as string | undefined;
        token.name = profile.name as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      // Add external ID to session for use in app
      if (token.externalId) {
        session.user.externalId = token.externalId as string;
      }
      return session;
    },
  },
  debug: env.NODE_ENV === 'development',
});
```

---

### 3. Create Auth Type Extensions

Create `src/features/auth/auth.types.ts`:

```typescript
// Auth type extensions for next-auth
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      externalId: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    externalId?: string;
  }
}
```

---

### 4. Create NextAuth API Route Handler

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
// NextAuth API route handler
import { handlers } from '@/features/auth/auth';

export const { GET, POST } = handlers;
```

---

### 5. Create Route Protection Middleware

Create `src/middleware.ts`:

```typescript
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
```

---

### 6. Create User Sync Utility

Create `src/features/auth/syncUser.ts`:

```typescript
// Synchronize authenticated user with local database
import { findOrCreateUser } from '@/lib/db-utils';
import type { User } from '@prisma/client';

interface SyncUserParams {
  externalId: string;
  email?: string | null;
  displayName?: string | null;
}

/**
 * Find or create user in local database after OAuth sign-in
 */
export async function syncUser(params: SyncUserParams): Promise<User> {
  const { externalId, email, displayName } = params;

  return findOrCreateUser(externalId, {
    email: email ?? undefined,
    displayName: displayName ?? undefined,
  });
}
```

---

### 7. Create Client-Side Session Hook

Create `src/features/auth/useSession.ts`:

```typescript
// Re-export next-auth session hook for client components
'use client';

export { useSession } from 'next-auth/react';
```

---

### 8. Create Auth Barrel Export

Create `src/features/auth/index.ts`:

```typescript
// Auth feature exports
export { auth, signIn, signOut } from './auth';
export { useSession } from './useSession';
export { syncUser } from './syncUser';
export type { Session } from 'next-auth';
```

---

### 9. Create Sign-In Page

Create `src/app/auth/signin/page.tsx`:

```typescript
// Sign-in page with OAuth provider
import { signIn } from '@/features/auth/auth';

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? '/session/new';
  const error = params.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="container flex max-w-md flex-col items-center gap-8 rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>

        {error && (
          <div className="w-full rounded-md bg-red-50 p-4 text-sm text-red-800">
            Authentication failed. Please try again.
          </div>
        )}

        <p className="text-center text-gray-600">
          Sign in with your ManuMuStudio account to continue
        </p>

        <form
          action={async () => {
            'use server';
            await signIn('manumustudio', { redirectTo: callbackUrl });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign in with ManuMuStudio
          </button>
        </form>

        <p className="text-sm text-gray-500">
          Don't have an account?{' '}
          <a
            href="https://auth.manumustudio.com/register"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create one here
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

### 10. Create Auth Error Page

Create `src/app/auth/error/page.tsx`:

```typescript
// Authentication error page
import Link from 'next/link';

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const error = params.error ?? 'Unknown error';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white">
      <div className="container flex max-w-md flex-col items-center gap-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="text-center text-gray-600">
          We encountered an error while signing you in.
        </p>
        <div className="w-full rounded-md bg-gray-50 p-4">
          <code className="text-sm text-gray-700">{error}</code>
        </div>
        <Link
          href="/auth/signin"
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
```

---

### 11. Update Protected App Layout

Replace `src/app/(app)/layout.tsx`:

```typescript
// Protected app layout with session provider and user info
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { auth, signOut } from '@/features/auth';
import { syncUser } from '@/features/auth/syncUser';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth();

  // Redirect to sign-in if no session
  if (!session?.user?.externalId) {
    redirect('/auth/signin');
  }

  // Sync user with local database
  await syncUser({
    externalId: session.user.externalId,
    email: session.user.email,
    displayName: session.user.name,
  });

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">
              Learning Speaking App
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Hello, {session.user.name ?? session.user.email ?? 'User'}
              </span>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
```

---

### 12. Create Test Protected Page

Create `src/app/(app)/session/new/page.tsx`:

```typescript
// New session page (protected route)
import { auth } from '@/features/auth';

export default async function NewSessionPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-gray-900">New Speaking Session</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-600">
          Welcome, {session?.user?.name ?? 'User'}! This is a protected route.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Session creation will be implemented in the next phase.
        </p>
      </div>
    </div>
  );
}
```

---

### 13. Update Landing Page with Sign-In Link

Replace `src/app/(public)/page.tsx`:

```typescript
// Landing page for unauthenticated users
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="container flex max-w-2xl flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Learning Speaking App
        </h1>
        <p className="text-xl text-gray-600">
          Practice speaking, get instant AI feedback, and track your progress over time.
        </p>
        <Link
          href="/auth/signin"
          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
        >
          Sign in to start
        </Link>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File Path | Action | Description |
|-----------|--------|-------------|
| `src/features/auth/auth.ts` | Create | NextAuth configuration with OIDC provider |
| `src/features/auth/auth.types.ts` | Create | Type extensions for NextAuth session |
| `src/features/auth/syncUser.ts` | Create | User synchronization with local database |
| `src/features/auth/useSession.ts` | Create | Client-side session hook |
| `src/features/auth/index.ts` | Create | Auth feature barrel export |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | NextAuth API route handler |
| `src/middleware.ts` | Create | Route protection middleware |
| `src/app/auth/signin/page.tsx` | Create | Sign-in page with OAuth flow |
| `src/app/auth/error/page.tsx` | Create | Authentication error page |
| `src/app/(app)/layout.tsx` | Replace | Protected layout with session and user sync |
| `src/app/(app)/session/new/page.tsx` | Create | Test protected route |
| `src/app/(public)/page.tsx` | Replace | Landing page with working sign-in link |

---

## Definition of Done

- [ ] `npm run build` succeeds without errors
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Visiting `/session/new` redirects to `/auth/signin`
- [ ] Sign-in button redirects to `auth.manumustudio.com`
- [ ] After OAuth flow, user returns to the app with a valid session
- [ ] User record is created in local PostgreSQL database with `externalId`
- [ ] Protected layout shows user name and sign-out button
- [ ] Sign-out clears session and redirects to landing page
- [ ] All auth files have one-line header comments
- [ ] No `any` types in any auth-related files
- [ ] Session includes `externalId` in the user object
- [ ] Middleware protects all routes under `/session`, `/history`, `/profile`, `/settings`
- [ ] Landing page sign-in link works correctly

---

## Testing Checklist

1. **Sign-in flow:**
   - [ ] Click "Sign in to start" on landing page
   - [ ] Redirected to auth.manumustudio.com
   - [ ] Sign in with test account
   - [ ] Redirected back to `/session/new`
   - [ ] User name displayed in header

2. **Route protection:**
   - [ ] Sign out
   - [ ] Try to visit `/session/new` directly
   - [ ] Redirected to `/auth/signin` with `callbackUrl` parameter
   - [ ] After sign-in, redirected back to `/session/new`

3. **Database sync:**
   - [ ] Check PostgreSQL database
   - [ ] User record exists with matching `externalId`
   - [ ] Email and displayName populated if available

4. **Sign-out:**
   - [ ] Click "Sign Out"
   - [ ] Redirected to landing page
   - [ ] Session cleared
   - [ ] Cannot access protected routes

---

## Notes for Cursor

- NextAuth v5 (beta) uses a simpler API than v4
- Session strategy is JWT (no database sessions)
- Middleware runs on edge runtime for fast route protection
- User sync happens in the protected layout server component
- PKCE and state checks are enabled for security
- Always use `'use server'` for form actions that call `signIn`/`signOut`
- The `auth()` function can be called in Server Components to get the session
- The `useSession()` hook must be used in Client Components with `'use client'`
