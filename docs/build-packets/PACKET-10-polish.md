# PACKET-10 — Polish, Rate Limiting & Production Readiness

**Branch**: `feature/polish`
**Version**: `0.10.0`

## Prerequisites

- All core features implemented (processing pipeline, results UI, history, GDPR)
- Upstash Redis credentials available
- All API routes functional
- Next.js app builds successfully

## What to Build

### 1. Install rate limiting dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Add Redis environment variables

Update `src/lib/env.ts`:

```typescript
UPSTASH_REDIS_REST_URL: z.string().url().optional(),
UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
```

### 3. Create rate limiter utility

Create `src/lib/rateLimit.ts`:

```typescript
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
```

### 4. Apply rate limiting to session creation

Update `src/app/api/sessions/route.ts` POST handler:

Add at the beginning of the POST handler, after auth check:

```typescript
import { getSessionRateLimit } from '@/lib/rateLimit';

// Inside POST handler, after auth:
const rateLimit = getSessionRateLimit();
if (rateLimit) {
  const identifier = user.id;
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: 'Too many sessions. Try again later.',
        code: 'RATE_LIMITED',
      },
      { status: 429 }
    );
  }
}
```

### 5. Create ErrorBoundary component

Create `src/components/ui/ErrorBoundary/ErrorBoundary.types.ts`:

```typescript
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

Create `src/components/ui/ErrorBoundary/ErrorBoundary.tsx`:

```typescript
'use client';
// React error boundary for graceful error handling
import React from 'react';
import { ErrorBoundaryProps } from './ErrorBoundary.types';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Create `src/components/ui/ErrorBoundary/index.ts`:

```typescript
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary.types';
```

### 6. Add ErrorBoundary to app layout

Update `src/app/(app)/layout.tsx`:

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {/* existing layout code */}
      {children}
    </ErrorBoundary>
  );
}
```

### 7. Create LoadingSpinner component

Create `src/components/ui/LoadingSpinner/LoadingSpinner.types.ts`:

```typescript
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

Create `src/components/ui/LoadingSpinner/LoadingSpinner.tsx`:

```typescript
// Reusable loading spinner with size variants
import { LoadingSpinnerProps } from './LoadingSpinner.types';

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  );
}
```

Create `src/components/ui/LoadingSpinner/index.ts`:

```typescript
export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner.types';
```

### 8. Create structured logger

Create `src/lib/logger.ts`:

```typescript
// Structured logging utility — never logs transcript content
type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  sessionId?: string;
  userId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function log(entry: LogEntry): void {
  const timestamp = new Date().toISOString();
  const logData = {
    ...entry,
    timestamp,
    environment: process.env.NODE_ENV,
  };

  // In production, send to monitoring service
  // For now, structured console output
  const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'info';
  console[method](JSON.stringify(logData));
}
```

### 9. Add logging to processing pipeline

Update `src/app/api/internal/process/route.ts`:

Import logger:

```typescript
import { log } from '@/lib/logger';
```

Add logging at key steps:

```typescript
// After status update to TRANSCRIBING
log({
  level: 'info',
  message: 'Starting transcription',
  sessionId,
  userId: session.userId,
});

// After transcription completes
log({
  level: 'info',
  message: 'Transcription complete',
  sessionId,
  userId: session.userId,
  metadata: { wordCount },
});

// After analysis completes
log({
  level: 'info',
  message: 'Analysis complete',
  sessionId,
  userId: session.userId,
  metadata: { insightCount: analysis.insights.length },
});

// After marking DONE
const processingDuration = Date.now() - startTime;
log({
  level: 'info',
  message: 'Processing complete',
  sessionId,
  userId: session.userId,
  duration: processingDuration,
});

// In error handler
log({
  level: 'error',
  message: 'Processing failed',
  sessionId,
  userId: session?.userId,
  error: error instanceof Error ? error.message : 'Unknown error',
});
```

Add `startTime` tracking at the beginning of the handler:

```typescript
const startTime = Date.now();
```

### 10. Add metadata to root layout

Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learning Speaking App',
  description: 'Practice speaking English and get AI-powered pattern feedback',
  openGraph: {
    title: 'Learning Speaking App',
    description: 'Practice speaking English and get AI-powered pattern feedback',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 11. Create robots.txt

Create `src/app/robots.ts`:

```typescript
// SEO configuration - prevent indexing of API and session routes
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/session/'],
      },
    ],
  };
}
```

### 12. Create loading skeletons

Create `src/features/session/SessionCard/SessionCardSkeleton.tsx`:

```typescript
// Loading skeleton for SessionCard
export function SessionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-24 rounded bg-gray-200" />
          </div>
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>
        <div className="h-8 w-16 rounded bg-gray-200" />
      </div>
    </div>
  );
}
```

Create `src/features/insights/InsightCard/InsightCardSkeleton.tsx`:

```typescript
// Loading skeleton for InsightCard
export function InsightCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-gray-200" />
          <div className="h-2 w-2 rounded-full bg-gray-200" />
        </div>
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
      </div>
    </div>
  );
}
```

### 13. Final audit checklist

Perform these checks across the codebase:

- [ ] Remove all `console.log` statements (replace with `log()`)
- [ ] Verify all API routes call `auth()` and validate user
- [ ] Verify all Prisma queries include `where: { userId }`
- [ ] Verify all files have header comments
- [ ] Verify all components follow 4-file pattern
- [ ] Run `npx tsc --noEmit` and fix all type errors
- [ ] Run `npm run lint` and fix all warnings
- [ ] Test rate limiting (try creating 6 sessions in an hour)
- [ ] Test error boundary (throw error in a component)
- [ ] Test GDPR delete (verify cascade works)
- [ ] Test GDPR export (verify JSON contains all data)
- [ ] Verify audio deleted from R2 after transcription
- [ ] Verify transcript never logged to console

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/lib/rateLimit.ts` | Rate limiting with Upstash Redis |
| `src/lib/logger.ts` | Structured logging (no PII) |
| `src/components/ui/ErrorBoundary/ErrorBoundary.tsx` | Error boundary wrapper |
| `src/components/ui/ErrorBoundary/ErrorBoundary.types.ts` | Types |
| `src/components/ui/ErrorBoundary/index.ts` | Barrel |
| `src/components/ui/LoadingSpinner/LoadingSpinner.tsx` | Spinner component |
| `src/components/ui/LoadingSpinner/LoadingSpinner.types.ts` | Types |
| `src/components/ui/LoadingSpinner/index.ts` | Barrel |
| `src/features/session/SessionCard/SessionCardSkeleton.tsx` | Loading skeleton |
| `src/features/insights/InsightCard/InsightCardSkeleton.tsx` | Loading skeleton |
| `src/app/api/sessions/route.ts` | Updated with rate limiting |
| `src/app/api/internal/process/route.ts` | Updated with logging |
| `src/app/(app)/layout.tsx` | Updated with ErrorBoundary |
| `src/app/layout.tsx` | Updated with metadata |
| `src/app/robots.ts` | SEO robots config |

## Definition of Done

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes with no warnings
- [ ] Rate limiting returns 429 after 5 sessions/hour
- [ ] Error boundary catches rendering errors gracefully
- [ ] Loading skeletons show during data fetches
- [ ] Structured logs output for pipeline steps
- [ ] No `console.log` in production code (only `log()` utility)
- [ ] All pages have proper metadata/titles
- [ ] All components follow 4-file pattern
- [ ] All files have header comments
- [ ] All API routes validate auth
- [ ] All Prisma queries scoped to userId
- [ ] robots.txt blocks /api/ and /session/ from crawlers
- [ ] GDPR delete cascade verified
- [ ] GDPR export returns complete JSON
- [ ] Audio cleanup verified (deleted after transcription)
- [ ] No transcript content in logs
- [ ] Production environment variables documented
- [ ] Error states tested and working
