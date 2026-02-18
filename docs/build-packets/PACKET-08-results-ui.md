# PACKET-08 — Results UI with Status Polling

**Branch**: `feature/results-ui`
**Version**: `0.8.0`

## Prerequisites

- Processing pipeline (PACKET-07) deployed and functional
- `GET /api/sessions/:id` returns session with status, insights, transcript
- Prisma models include `Insight` with category, pattern, detail, examples, suggestion
- Tailwind CSS configured

## What to Build

### 1. Create session status polling hook

Create `src/features/session/useSessionStatus.ts`:

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

const POLL_INTERVAL_FAST = 3000; // 3s for first 30s
const POLL_INTERVAL_SLOW = 10000; // 10s after 30s
const FAST_POLL_DURATION = 30000; // 30s
const MAX_POLL_DURATION = 300000; // 5 minutes

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

    const isProcessing = ['UPLOADED', 'TRANSCRIBING', 'ANALYZING'].includes(
      session.status
    );
    if (!isProcessing) return;

    const elapsed = Date.now() - pollStartTime;
    if (elapsed > MAX_POLL_DURATION) {
      setError('Processing is taking longer than expected. Please check back later.');
      return;
    }

    const interval =
      elapsed < FAST_POLL_DURATION ? POLL_INTERVAL_FAST : POLL_INTERVAL_SLOW;

    const timer = setInterval(fetchSession, interval);
    return () => clearInterval(timer);
  }, [session, fetchSession, pollStartTime]);

  return {
    session,
    isLoading,
    isProcessing: session
      ? ['UPLOADED', 'TRANSCRIBING', 'ANALYZING'].includes(session.status)
      : false,
    isDone: session?.status === 'DONE',
    isFailed: session?.status === 'FAILED',
    error,
    retry,
  };
}
```

### 2. Create ProcessingStatus component

Create `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts`:

```typescript
export interface ProcessingStatusProps {
  status: 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  errorMessage?: string | null;
  onRetry?: () => void;
}
```

Create `src/components/ui/ProcessingStatus/ProcessingStatus.tsx`:

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

Create `src/components/ui/ProcessingStatus/index.ts`:

```typescript
export { ProcessingStatus } from './ProcessingStatus';
export type { ProcessingStatusProps } from './ProcessingStatus.types';
```

### 3. Create InsightCard component

Create `src/features/insights/InsightCard/InsightCard.types.ts`:

```typescript
export interface InsightCardProps {
  category: 'grammar' | 'vocabulary' | 'structure';
  pattern: string;
  detail: string;
  frequency?: number | null;
  severity?: 'high' | 'medium' | 'low' | null;
  examples?: string[] | null;
  suggestion?: string | null;
}
```

Create `src/features/insights/InsightCard/InsightCard.tsx`:

```typescript
'use client';
// Displays a single detected pattern with expandable details
import { useState } from 'react';
import { InsightCardProps } from './InsightCard.types';

const categoryColors = {
  grammar: 'bg-blue-100 text-blue-800 border-blue-200',
  vocabulary: 'bg-purple-100 text-purple-800 border-purple-200',
  structure: 'bg-green-100 text-green-800 border-green-200',
};

const severityColors = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
};

export function InsightCard({
  category,
  pattern,
  detail,
  frequency,
  severity,
  examples,
  suggestion,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${categoryColors[category]}`}
            >
              {category}
            </span>
            {severity && (
              <div
                className={`h-2 w-2 rounded-full ${severityColors[severity]}`}
                title={`${severity} severity`}
              />
            )}
            {frequency && (
              <span className="text-xs text-gray-500">
                {frequency}x occurrences
              </span>
            )}
          </div>
          <h4 className="mt-2 font-semibold text-gray-900">{pattern}</h4>
          <p className="mt-1 text-sm text-gray-600">{detail}</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Less' : 'More'}
        </button>
      </div>

      {isExpanded && (examples || suggestion) && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {examples && examples.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700">Examples:</h5>
              <ul className="mt-1 space-y-1 text-sm text-gray-600">
                {examples.map((example, i) => (
                  <li key={i} className="italic">
                    "{example}"
                  </li>
                ))}
              </ul>
            </div>
          )}
          {suggestion && (
            <div className="rounded-md bg-blue-50 p-3">
              <h5 className="text-sm font-medium text-blue-900">Suggestion:</h5>
              <p className="mt-1 text-sm text-blue-700">{suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Create `src/features/insights/InsightCard/index.ts`:

```typescript
export { InsightCard } from './InsightCard';
export type { InsightCardProps } from './InsightCard.types';
```

### 4. Create InsightsList component

Create `src/features/insights/InsightsList/InsightsList.types.ts`:

```typescript
import { InsightCardProps } from '../InsightCard/InsightCard.types';

export interface InsightsListProps {
  insights: InsightCardProps[];
}
```

Create `src/features/insights/InsightsList/InsightsList.tsx`:

```typescript
// Container for displaying all detected patterns sorted by severity
import { InsightCard } from '../InsightCard';
import { InsightsListProps } from './InsightsList.types';

const severityOrder = { high: 0, medium: 1, low: 2 };

export function InsightsList({ insights }: InsightsListProps) {
  const sorted = [...insights].sort((a, b) => {
    const aSev = severityOrder[a.severity ?? 'low'];
    const bSev = severityOrder[b.severity ?? 'low'];
    return aSev - bSev;
  });

  return (
    <div className="space-y-4">
      {sorted.map((insight, index) => (
        <InsightCard key={index} {...insight} />
      ))}
    </div>
  );
}
```

Create `src/features/insights/InsightsList/index.ts`:

```typescript
export { InsightsList } from './InsightsList';
export type { InsightsListProps } from './InsightsList.types';
```

### 5. Create FocusNextBanner component

Create `src/features/insights/FocusNextBanner/FocusNextBanner.types.ts`:

```typescript
export interface FocusNextBannerProps {
  focusNext: string;
}
```

Create `src/features/insights/FocusNextBanner/FocusNextBanner.tsx`:

```typescript
// Prominent banner highlighting the recommended focus for next session
import { FocusNextBannerProps } from './FocusNextBanner.types';

export function FocusNextBanner({ focusNext }: FocusNextBannerProps) {
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white shadow-lg">
      <h3 className="text-sm font-medium uppercase tracking-wide opacity-90">
        Focus for Next Session
      </h3>
      <p className="mt-2 text-xl font-semibold">{focusNext}</p>
    </div>
  );
}
```

Create `src/features/insights/FocusNextBanner/index.ts`:

```typescript
export { FocusNextBanner } from './FocusNextBanner';
export type { FocusNextBannerProps } from './FocusNextBanner.types';
```

### 6. Create SessionSummary component

Create `src/features/insights/SessionSummary/SessionSummary.types.ts`:

```typescript
export interface SessionSummaryProps {
  durationSecs: number | null;
  topic: string | null;
  wordCount: number | null;
  createdAt: string;
  transcript?: string;
}
```

Create `src/features/insights/SessionSummary/SessionSummary.tsx`:

```typescript
'use client';
// Displays session metadata and optional expandable transcript
import { useState } from 'react';
import { SessionSummaryProps } from './SessionSummary.types';

function formatDuration(secs: number | null): string {
  if (!secs) return 'Unknown';
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}m ${seconds}s`;
}

export function SessionSummary({
  durationSecs,
  topic,
  wordCount,
  createdAt,
  transcript,
}: SessionSummaryProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Session Details</h3>
      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <span className="font-medium text-gray-700">Date:</span>{' '}
          <span className="text-gray-600">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
        {topic && (
          <div>
            <span className="font-medium text-gray-700">Topic:</span>{' '}
            <span className="text-gray-600">{topic}</span>
          </div>
        )}
        <div>
          <span className="font-medium text-gray-700">Duration:</span>{' '}
          <span className="text-gray-600">{formatDuration(durationSecs)}</span>
        </div>
        {wordCount && (
          <div>
            <span className="font-medium text-gray-700">Words spoken:</span>{' '}
            <span className="text-gray-600">{wordCount}</span>
          </div>
        )}
      </div>

      {transcript && (
        <div className="mt-4">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showTranscript ? 'Hide' : 'Show'} transcript
          </button>
          {showTranscript && (
            <div className="mt-3 rounded-md bg-gray-50 p-4 text-sm text-gray-700">
              {transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Create `src/features/insights/SessionSummary/index.ts`:

```typescript
export { SessionSummary } from './SessionSummary';
export type { SessionSummaryProps } from './SessionSummary.types';
```

### 7. Create results page

Create `src/app/(app)/session/[id]/page.tsx`:

```typescript
'use client';
// Session results page with status polling and insights display
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionStatus } from '@/features/session/useSessionStatus';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { FocusNextBanner } from '@/features/insights/FocusNextBanner';
import { InsightsList } from '@/features/insights/InsightsList';
import { SessionSummary } from '@/features/insights/SessionSummary';

export default function SessionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { session, isLoading, isProcessing, isDone, isFailed, error, retry } =
    useSessionStatus(sessionId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-900">Error</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={retry}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/history"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to sessions
        </Link>
        <Link
          href="/record"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Session
        </Link>
      </div>

      {isProcessing && <ProcessingStatus status={session.status} />}

      {isFailed && (
        <ProcessingStatus
          status="FAILED"
          errorMessage={session.errorMessage}
          onRetry={() => router.refresh()}
        />
      )}

      {isDone && (
        <div className="space-y-6">
          {session.focusNext && (
            <FocusNextBanner focusNext={session.focusNext} />
          )}

          {session.insights && session.insights.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                Patterns Detected
              </h2>
              <InsightsList
                insights={session.insights.map((i) => ({
                  category: i.category as 'grammar' | 'vocabulary' | 'structure',
                  pattern: i.pattern,
                  detail: i.detail,
                  frequency: i.frequency,
                  severity: i.severity as 'high' | 'medium' | 'low' | null,
                  examples: i.examples,
                  suggestion: i.suggestion,
                }))}
              />
            </div>
          )}

          <SessionSummary
            durationSecs={session.durationSecs}
            topic={session.topic}
            wordCount={session.transcript?.wordCount ?? null}
            createdAt={session.createdAt}
            transcript={session.transcript?.text}
          />
        </div>
      )}
    </div>
  );
}
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/features/session/useSessionStatus.ts` | Polling hook |
| `src/components/ui/ProcessingStatus/ProcessingStatus.tsx` | Processing step display |
| `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts` | Types |
| `src/components/ui/ProcessingStatus/index.ts` | Barrel |
| `src/features/insights/InsightCard/InsightCard.tsx` | Single insight display |
| `src/features/insights/InsightCard/InsightCard.types.ts` | Types |
| `src/features/insights/InsightCard/index.ts` | Barrel |
| `src/features/insights/InsightsList/InsightsList.tsx` | Insights list container |
| `src/features/insights/InsightsList/InsightsList.types.ts` | Types |
| `src/features/insights/InsightsList/index.ts` | Barrel |
| `src/features/insights/FocusNextBanner/FocusNextBanner.tsx` | Focus suggestion banner |
| `src/features/insights/FocusNextBanner/FocusNextBanner.types.ts` | Types |
| `src/features/insights/FocusNextBanner/index.ts` | Barrel |
| `src/features/insights/SessionSummary/SessionSummary.tsx` | Session metadata + transcript |
| `src/features/insights/SessionSummary/SessionSummary.types.ts` | Types |
| `src/features/insights/SessionSummary/index.ts` | Barrel |
| `src/app/(app)/session/[id]/page.tsx` | Results page |

## Definition of Done

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Results page shows processing status while waiting
- [ ] Polling works correctly (3s then 10s intervals)
- [ ] Insights display with correct categories and severity colors
- [ ] FocusNext banner shows at top
- [ ] Transcript is expandable (collapsed by default)
- [ ] Failed state shows error + retry button
- [ ] All components follow 4-file pattern
- [ ] All files have header comments
- [ ] Loading states show appropriate skeletons/spinners
- [ ] Navigation links work correctly
