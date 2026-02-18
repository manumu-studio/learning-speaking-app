# PACKET-09 — Session History & GDPR Compliance

**Branch**: `feature/history-gdpr`
**Version**: `0.9.0`

## Prerequisites

- `GET /api/sessions` endpoint returns paginated session list
- `DELETE /api/sessions/:id` endpoint deletes a session
- Prisma schema with cascade deletes configured (User → Sessions → Transcripts/Insights)
- User authentication working (session contains userId)

## What to Build

### 1. Create SessionCard component

Create `src/features/session/SessionCard/SessionCard.types.ts`:

```typescript
export interface SessionCardProps {
  id: string;
  createdAt: string;
  durationSecs: number | null;
  topic: string | null;
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  topInsight?: string | null;
  onDelete: (id: string) => void;
}
```

Create `src/features/session/SessionCard/SessionCard.tsx`:

```typescript
'use client';
// Session summary card with click navigation and delete action
import Link from 'next/link';
import { useState } from 'react';
import { SessionCardProps } from './SessionCard.types';

const statusColors = {
  DONE: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  CREATED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  UPLOADED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  TRANSCRIBING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ANALYZING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

function formatDuration(secs: number | null): string {
  if (!secs) return 'Unknown';
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}m ${seconds}s`;
}

export function SessionCard({
  id,
  createdAt,
  durationSecs,
  topic,
  status,
  topInsight,
  onDelete,
}: SessionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    onDelete(id);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <Link href={`/session/${id}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  statusColors[status]
                }`}
              >
                {status}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>

            {topic && (
              <h4 className="mt-2 font-semibold text-gray-900">{topic}</h4>
            )}

            <p className="mt-1 text-sm text-gray-600">
              Duration: {formatDuration(durationSecs)}
            </p>

            {topInsight && (
              <p className="mt-2 text-sm italic text-gray-500">
                "{topInsight}"
              </p>
            )}
          </div>

          <div className="ml-4">
            {!showConfirm ? (
              <button
                onClick={handleDelete}
                className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
```

Create `src/features/session/SessionCard/index.ts`:

```typescript
export { SessionCard } from './SessionCard';
export type { SessionCardProps } from './SessionCard.types';
```

### 2. Create SessionList component

Create `src/features/session/SessionList/SessionList.types.ts`:

```typescript
import { SessionCardProps } from '../SessionCard/SessionCard.types';

export interface SessionListProps {
  sessions: Omit<SessionCardProps, 'onDelete'>[];
  onDelete: (id: string) => void;
}
```

Create `src/features/session/SessionList/SessionList.tsx`:

```typescript
// List container for session cards with empty state
import { SessionCard } from '../SessionCard';
import { SessionListProps } from './SessionList.types';

export function SessionList({ sessions, onDelete }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-lg font-medium text-gray-900">No sessions yet</p>
        <p className="mt-2 text-sm text-gray-600">
          Start your first speaking session to see it here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard key={session.id} {...session} onDelete={onDelete} />
      ))}
    </div>
  );
}
```

Create `src/features/session/SessionList/index.ts`:

```typescript
export { SessionList } from './SessionList';
export type { SessionListProps } from './SessionList.types';
```

### 3. Create Pagination component

Create `src/components/ui/Pagination/Pagination.types.ts`:

```typescript
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

Create `src/components/ui/Pagination/Pagination.tsx`:

```typescript
// Simple prev/next pagination controls
import { PaginationProps } from './Pagination.types';

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
```

Create `src/components/ui/Pagination/index.ts`:

```typescript
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination.types';
```

### 4. Create session history hook

Create `src/features/session/useSessionHistory.ts`:

```typescript
// Hook for fetching paginated session history with delete action
import { useState, useEffect, useCallback } from 'react';

interface SessionSummary {
  id: string;
  createdAt: string;
  durationSecs: number | null;
  topic: string | null;
  status: 'CREATED' | 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED';
  topInsight?: string | null;
}

interface UseSessionHistoryReturn {
  sessions: SessionSummary[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  deleteSession: (id: string) => Promise<void>;
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/sessions?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const deleteSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Refresh the list
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  return {
    sessions,
    isLoading,
    error,
    page,
    totalPages,
    setPage,
    deleteSession,
  };
}
```

### 5. Create history page

Create `src/app/(app)/history/page.tsx`:

```typescript
'use client';
// Session history page with pagination
import Link from 'next/link';
import { useSessionHistory } from '@/features/session/useSessionHistory';
import { SessionList } from '@/features/session/SessionList';
import { Pagination } from '@/components/ui/Pagination';

export default function HistoryPage() {
  const { sessions, isLoading, error, page, totalPages, setPage, deleteSession } =
    useSessionHistory();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Session History</h1>
        <Link
          href="/record"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Session
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <SessionList sessions={sessions} onDelete={deleteSession} />

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
```

### 6. Create ConfirmDialog component

Create `src/components/ui/ConfirmDialog/ConfirmDialog.types.ts`:

```typescript
export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'default';
}
```

Create `src/components/ui/ConfirmDialog/ConfirmDialog.tsx`:

```typescript
'use client';
// Reusable confirmation modal for destructive actions
import { ConfirmDialogProps } from './ConfirmDialog.types';

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `src/components/ui/ConfirmDialog/index.ts`:

```typescript
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog.types';
```

### 7. Create GDPR profile endpoints

Create `src/app/api/profile/route.ts`:

```typescript
// User profile GET and DELETE endpoints for GDPR compliance
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.externalId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
    include: {
      consents: true,
      patternProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    consents: user.consents,
    patternProfile: user.patternProfile,
    createdAt: user.createdAt,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.externalId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  // Cascade delete via Prisma schema
  await prisma.user.delete({
    where: { id: user.id },
  });

  return NextResponse.json({ ok: true });
}
```

### 8. Create consent management endpoint

Create `src/app/api/profile/consents/route.ts`:

```typescript
// Consent flag management endpoint
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/db';

const updateConsentSchema = z.object({
  flag: z.enum(['AUDIO_STORAGE', 'TRANSCRIPT_STORAGE', 'PATTERN_TRACKING']),
  granted: z.boolean(),
});

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.externalId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateConsentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { flag, granted } = parsed.data;

  const consent = await prisma.userConsent.upsert({
    where: {
      userId_flag: {
        userId: user.id,
        flag,
      },
    },
    create: {
      userId: user.id,
      flag,
      granted,
    },
    update: {
      granted,
      grantedAt: granted ? new Date() : undefined,
      revokedAt: granted ? null : new Date(),
    },
  });

  return NextResponse.json(consent);
}
```

### 9. Create data export endpoint

Create `src/app/api/profile/export/route.ts`:

```typescript
// GDPR data export endpoint - returns all user data as JSON
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.externalId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
    include: {
      sessions: {
        include: {
          transcript: true,
          insights: true,
        },
      },
      consents: true,
      patternProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const exportData = {
    profile: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    sessions: user.sessions,
    consents: user.consents,
    patternProfile: user.patternProfile,
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(exportData, null, 2);

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="lsa-data-export.json"',
    },
  });
}
```

### 10. Create settings/privacy page

Create `src/app/(app)/settings/page.tsx`:

```typescript
'use client';
// Settings and privacy page with GDPR controls
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function SettingsPage() {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    window.location.href = '/api/profile/export';
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch('/api/profile', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      router.push('/');
    } catch (error) {
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Settings & Privacy</h1>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Your Data</h2>
          <p className="mt-2 text-sm text-gray-600">
            Export or delete all your data from Learning Speaking App.
          </p>

          <div className="mt-4 space-y-3">
            <button
              onClick={handleExport}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export My Data
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete All My Data
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete All Data"
        message="This will permanently delete all your data including session history, transcripts, and insights. This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Everything'}
        variant="danger"
      />
    </div>
  );
}
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/features/session/SessionCard/SessionCard.tsx` | Session summary card |
| `src/features/session/SessionCard/SessionCard.types.ts` | Types |
| `src/features/session/SessionCard/index.ts` | Barrel |
| `src/features/session/SessionList/SessionList.tsx` | Session list container |
| `src/features/session/SessionList/SessionList.types.ts` | Types |
| `src/features/session/SessionList/index.ts` | Barrel |
| `src/features/session/useSessionHistory.ts` | History pagination hook |
| `src/components/ui/Pagination/Pagination.tsx` | Pagination controls |
| `src/components/ui/Pagination/Pagination.types.ts` | Types |
| `src/components/ui/Pagination/index.ts` | Barrel |
| `src/components/ui/ConfirmDialog/ConfirmDialog.tsx` | Confirmation modal |
| `src/components/ui/ConfirmDialog/ConfirmDialog.types.ts` | Types |
| `src/components/ui/ConfirmDialog/index.ts` | Barrel |
| `src/app/api/profile/route.ts` | GET + DELETE profile |
| `src/app/api/profile/consents/route.ts` | PUT consent flags |
| `src/app/api/profile/export/route.ts` | GET data export |
| `src/app/(app)/settings/page.tsx` | Settings/privacy page |
| `src/app/(app)/history/page.tsx` | History page |

## Definition of Done

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] History page shows paginated sessions
- [ ] Click session card navigates to results page
- [ ] Delete session works with confirmation
- [ ] Export downloads JSON file with all user data
- [ ] Delete all data cascade works correctly
- [ ] Empty state shows on history when no sessions
- [ ] All components follow 4-file pattern
- [ ] All files have header comments
- [ ] All API routes validate authentication
- [ ] All Prisma queries scoped to userId
