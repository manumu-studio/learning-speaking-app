# PACKET-08a — Session Status Polling + Processing Status Display

**Recommended Model**: Sonnet 4.6 Thinking

You are building PACKET-08a for the Learning Speaking App. Follow all rules in `.cursorrules`.

---

## SCOPE

### Files to CREATE (4 files):

1. `src/features/session/useSessionStatus.ts` — Polling hook for session status
2. `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts` — Types
3. `src/components/ui/ProcessingStatus/ProcessingStatus.tsx` — Processing step display with animated indicator
4. `src/components/ui/ProcessingStatus/index.ts` — Barrel export

### Files to MODIFY:

NONE

### Dependencies to Install:

NONE

---

## CRITICAL: Prisma Schema Reference

The `useSessionStatus` hook returns data matching the GET `/api/sessions/:id` API response shape. Reference these Prisma model fields:

```prisma
model Session {
  id            String            @id @default(cuid())
  userId        String
  status        SessionStatus     @default(CREATED)
  audioUrl      String?
  durationSecs  Int?
  topic         String?
  focusNext     String?
  errorMessage  String?
  createdAt     DateTime          @default(now())
  transcript    Transcript?
  insights      Insight[]
  user          User              @relation(...)
}

model Transcript {
  id         String   @id @default(cuid())
  sessionId  String   @unique
  text       String   @db.Text
  wordCount  Int?
  createdAt  DateTime @default(now())
  session    Session  @relation(...)
}

model Insight {
  id         String   @id @default(cuid())
  sessionId  String
  category   String
  pattern    String
  detail     String   @db.Text
  frequency  Int?
  severity   String?
  examples   String[] @default([])
  suggestion String?  @db.Text
  createdAt  DateTime @default(now())
  session    Session  @relation(...)
}

enum SessionStatus {
  CREATED
  UPLOADED
  TRANSCRIBING
  ANALYZING
  DONE
  FAILED
}
```

**Key Points:**
- `SessionDetail` interface must match the API response shape (includes nested `transcript` and `insights`)
- Use string literal union types for `SessionStatus` in client code (no @prisma/client imports in 'use client' files)
- Processing states: `UPLOADED`, `TRANSCRIBING`, `ANALYZING` (user sees animated progress)
- Terminal states: `DONE`, `FAILED`

---

## FULL CODE FOR EACH FILE

### File 1: `src/features/session/useSessionStatus.ts`

```typescript
// Hook for polling session status until processing completes
import { useState, useEffect, useCallback } from 'react';

export interface SessionDetail {
  id: string;
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  durationSecs: number | null;
  topic: string | null;
  focusNext: string | null;
  errorMessage: string | null;
  createdAt: string;
  transcript?: {
    text: string;
    wordCount: number | null;
  };
  insights: Array<{
    id: string;
    category: string;
    pattern: string;
    detail: string;
    frequency: number | null;
    severity: string | null;
    examples: string[] | null;
    suggestion: string | null;
  }>;
}

interface UseSessionStatusReturn {
  session: SessionDetail | null;
  isLoading: boolean;
  isProcessing: boolean;
  isDone: boolean;
  isFailed: boolean;
  error: string | null;
  retry: () => void;
}

const POLL_INTERVAL_FAST = 3000;
const POLL_INTERVAL_SLOW = 10000;
const FAST_POLL_DURATION = 30000;
const MAX_POLL_DURATION = 300000;

export function useSessionStatus(sessionId: string): UseSessionStatusReturn {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollStartTime] = useState(Date.now());

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      const data = await response.json();
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;

    const isProcessing = ['UPLOADED', 'TRANSCRIBING', 'ANALYZING'].includes(session.status);
    if (!isProcessing) return;

    const elapsed = Date.now() - pollStartTime;
    if (elapsed > MAX_POLL_DURATION) {
      setError('Processing is taking longer than expected. Please check back later.');
      return;
    }

    const interval = elapsed < FAST_POLL_DURATION ? POLL_INTERVAL_FAST : POLL_INTERVAL_SLOW;

    const timer = setInterval(fetchSession, interval);
    return () => clearInterval(timer);
  }, [session, fetchSession, pollStartTime]);

  return {
    session,
    isLoading,
    isProcessing: session ? ['UPLOADED', 'TRANSCRIBING', 'ANALYZING'].includes(session.status) : false,
    isDone: session?.status === 'DONE',
    isFailed: session?.status === 'FAILED',
    error,
    retry,
  };
}
```

---

### File 2: `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts`

```typescript
// Type definitions for ProcessingStatus component
export interface ProcessingStatusProps {
  status: 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  errorMessage?: string | null;
  onRetry?: () => void;
}
```

---

### File 3: `src/components/ui/ProcessingStatus/ProcessingStatus.tsx`

```typescript
'use client';
// Displays current processing step with animated visual indicator
import { ProcessingStatusProps } from './ProcessingStatus.types';

export function ProcessingStatus({
  status,
  errorMessage,
  onRetry,
}: ProcessingStatusProps) {
  if (status === 'FAILED') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-900">Processing Failed</h3>
        <p className="mt-2 text-sm text-red-700">
          {errorMessage || 'An error occurred during processing.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const steps = [
    { key: 'UPLOADED', label: 'Uploaded' },
    { key: 'TRANSCRIBING', label: 'Transcribing your speech...' },
    { key: 'ANALYZING', label: 'Analyzing patterns...' },
    { key: 'DONE', label: 'Done!' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h3 className="text-lg font-semibold text-blue-900">Processing Your Session</h3>
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'animate-pulse bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              <span
                className={`text-sm ${
                  isActive ? 'font-medium text-blue-900' : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### File 4: `src/components/ui/ProcessingStatus/index.ts`

```typescript
// Barrel export for ProcessingStatus component
export { ProcessingStatus } from './ProcessingStatus';
export type { ProcessingStatusProps } from './ProcessingStatus.types';
```

---

## VALIDATION

After implementing all files, validate the build:

```bash
npx tsc --noEmit
npm run build
```

Both commands must complete with zero errors.

---

## KEY IMPLEMENTATION NOTES

1. **SessionDetail interface** matches GET `/api/sessions/:id` response shape exactly (includes transcript and insights relations)
2. **Adaptive polling** prevents server overload:
   - Fast polling: 3s intervals for first 30s
   - Slow polling: 10s intervals after 30s
   - Timeout: 5 minutes with user-friendly message
3. **Processing status detection**: `UPLOADED`, `TRANSCRIBING`, `ANALYZING` are all "processing" states
4. **ProcessingStatus component** follows mandatory 4-file pattern (tsx, types.ts, index.ts)
5. **Visual feedback**:
   - Active step uses `animate-pulse` Tailwind class
   - Completed steps show green checkmark
   - Failed state shows error message + retry button
6. **Error resilience**: Network errors shown separately from processing failures (via `error` state vs `session.errorMessage`)

---

## DO NOT

- Import from `@prisma/client` in client components (these are `'use client'` — use string union types instead)
- Skip the 4-file component pattern
- Omit header comments on any file
- Use `any` type anywhere
- Install new dependencies
- Create additional files beyond the 4 listed

---

## DOCUMENTATION

After successful validation, create these documentation files:

### Journal Entry: `docs/journal/ENTRY-08a.md`

```markdown
# ENTRY-08a — Session Status Polling + Processing Status Display

**Date**: 2026-02-18
**Type**: Feature
**Branch**: feature/results-ui
**Version**: 0.8.0

## Summary

Built session status polling hook and processing status display component for the results UI.

## Files Created

- `src/features/session/useSessionStatus.ts` — Polling hook with adaptive intervals
- `src/components/ui/ProcessingStatus/ProcessingStatus.tsx` — Step indicator component
- `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts` — Types
- `src/components/ui/ProcessingStatus/index.ts` — Barrel export

## Key Decisions

1. **Adaptive polling**: 3s intervals for first 30s, then 10s intervals. Max 5 minutes before timeout message.
2. **Processing states**: Tracks UPLOADED → TRANSCRIBING → ANALYZING → DONE visually with step indicators.
3. **Error resilience**: FAILED state shows error message + retry button. Network errors shown separately from processing failures.
4. **Animated indicator**: Active step uses `animate-pulse` for visual feedback. Completed steps show green checkmark.

## Next Steps

- PACKET-08b: InsightCard, InsightsList, FocusNextBanner, SessionSummary, and results page integration
```

---

### Build Report: `docs/build-packet-reports/PACKET-08a-session-status-report.md`

```markdown
# Build Report: PACKET-08a — Session Status Polling + Processing Status

**Date**: 2026-02-18
**Branch**: feature/results-ui
**Version**: 0.8.0

## What Was Built

✅ Session status polling hook with adaptive intervals
✅ Processing status step indicator component (4-file pattern)

## Files Created

- `src/features/session/useSessionStatus.ts` (80 lines)
- `src/components/ui/ProcessingStatus/ProcessingStatus.tsx` (65 lines)
- `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts` (8 lines)
- `src/components/ui/ProcessingStatus/index.ts` (3 lines)

## Dependencies Added

NONE

## Validation

```bash
✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)
```

## Testing Notes

- Hook polls GET `/api/sessions/:id`
- Polling stops when status reaches `DONE` or `FAILED`
- Timeout after 5 minutes with user-friendly message
- ProcessingStatus component renders 4 steps with visual state tracking
- Failed state includes retry mechanism via `onRetry` callback
```

---

## ROADMAP UPDATE

After creating documentation, update `docs/roadmap.md`:

Find the PACKET-08a entry and mark it complete:

```diff
- ⬜ **PACKET-08a** — Session status polling + ProcessingStatus component
+ ✅ **PACKET-08a** — Session status polling + ProcessingStatus component (2026-02-18)
```

---

## References

See `.cursorrules` for TypeScript standards, component patterns, and project structure.
