# PACKET-06 — Session Upload API + R2 Storage

**Branch**: `feature/upload-api`
**Version**: `0.6.0`
**Prerequisites**:
- PACKET-05 complete (recording UI produces audio Blob)
- Cloudflare R2 bucket created
- Environment variables set:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `DATABASE_URL`
  - All auth variables from PACKET-03

---

## What to Build

### 0. Install dependencies

```bash
npm install @aws-sdk/client-s3
```

### 1. Create R2 storage client

**File**: `src/lib/storage/r2.ts`

```typescript
// Cloudflare R2 storage client for temporary audio files
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

/**
 * Upload audio file to R2 bucket
 */
export async function uploadAudio(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * Retrieve audio file from R2 bucket
 */
export async function getAudio(key: string): Promise<Buffer> {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
  return Buffer.from(await response.Body!.transformToByteArray());
}

/**
 * Delete audio file from R2 bucket
 */
export async function deleteAudio(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}
```

### 2. Create shared API utilities

**File**: `src/lib/api.ts`

```typescript
// Shared API response helpers and utilities
export function errorResponse(
  message: string,
  code: string,
  status: number
): Response {
  return Response.json({ error: message, code }, { status });
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Validate file size and type
 */
export function validateAudioFile(
  file: File,
  maxSizeMB = 50
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  if (!file.type.startsWith('audio/')) {
    return {
      valid: false,
      error: 'File must be an audio file',
    };
  }

  return { valid: true };
}

/**
 * Generate R2 storage key for session audio
 */
export function generateAudioKey(
  userId: string,
  sessionId: string,
  extension = 'webm'
): string {
  return `sessions/${userId}/${sessionId}/audio.${extension}`;
}
```

### 3. Create session creation API

**File**: `src/app/api/sessions/route.ts`

```typescript
// Session creation and listing API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/db';
import { uploadAudio, generateAudioKey, validateAudioFile, successResponse, errorResponse } from '@/lib';
import { SessionStatus } from '@prisma/client';

/**
 * POST /api/sessions
 * Create new speaking session and upload audio to R2
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const durationSecs = formData.get('duration') as string | null;
    const topic = formData.get('topic') as string | null;
    const language = formData.get('language') as string | null;

    if (!audioFile) {
      return errorResponse('Audio file is required', 'MISSING_AUDIO', 400);
    }

    if (!durationSecs || isNaN(Number(durationSecs))) {
      return errorResponse('Valid duration is required', 'INVALID_DURATION', 400);
    }

    // Validate audio file
    const validation = validateAudioFile(audioFile);
    if (!validation.valid) {
      return errorResponse(
        validation.error!,
        'INVALID_FILE',
        validation.error!.includes('size') ? 413 : 400
      );
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          externalId: session.user.externalId,
          email: session.user.email,
          displayName: session.user.name,
        },
      });
    }

    // Create session record
    const speakingSession = await prisma.speakingSession.create({
      data: {
        userId: user.id,
        status: SessionStatus.CREATED,
        durationSecs: Number(durationSecs),
        language: language || 'en',
        topic: topic || null,
      },
    });

    // Generate storage key and upload to R2
    const extension = audioFile.type.split('/')[1] || 'webm';
    const storageKey = generateAudioKey(user.id, speakingSession.id, extension);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    await uploadAudio(storageKey, audioBuffer, audioFile.type);

    // Update session with audio URL and status
    const updatedSession = await prisma.speakingSession.update({
      where: { id: speakingSession.id },
      data: {
        audioUrl: storageKey,
        status: SessionStatus.UPLOADED,
      },
    });

    // TODO: Trigger QStash processing (PACKET-08)

    return successResponse(
      {
        id: updatedSession.id,
        status: updatedSession.status,
        createdAt: updatedSession.createdAt.toISOString(),
        estimatedWaitSecs: 30,
      },
      201
    );
  } catch (error) {
    console.error('Session creation error:', error);
    return errorResponse(
      'Failed to create session',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * GET /api/sessions
 * List user's sessions with pagination
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      return successResponse({ sessions: [], total: 0, page: 1, limit: 10 });
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.speakingSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          durationSecs: true,
          language: true,
          topic: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.speakingSession.count({
        where: { userId: user.id },
      }),
    ]);

    return successResponse({
      sessions,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Session list error:', error);
    return errorResponse('Failed to fetch sessions', 'INTERNAL_ERROR', 500);
  }
}
```

### 4. Create session detail and delete API

**File**: `src/app/api/sessions/[id]/route.ts`

```typescript
// Session detail and deletion API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/db';
import { deleteAudio, successResponse, errorResponse } from '@/lib';

/**
 * GET /api/sessions/:id
 * Fetch session details with transcript and insights
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      return errorResponse('User not found', 'USER_NOT_FOUND', 404);
    }

    const speakingSession = await prisma.speakingSession.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        transcript: true,
        insights: {
          orderBy: { severity: 'desc' },
        },
      },
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    return successResponse(speakingSession);
  } catch (error) {
    console.error('Session fetch error:', error);
    return errorResponse('Failed to fetch session', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete session and associated data (cascades to transcript/insights)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      return errorResponse('User not found', 'USER_NOT_FOUND', 404);
    }

    const speakingSession = await prisma.speakingSession.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    // Delete audio from R2 if exists
    if (speakingSession.audioUrl && !speakingSession.audioDeletedAt) {
      try {
        await deleteAudio(speakingSession.audioUrl);
      } catch (error) {
        console.warn('Failed to delete audio from R2:', error);
        // Continue with DB deletion even if R2 delete fails
      }
    }

    // Delete session (cascades to transcript and insights via Prisma)
    await prisma.speakingSession.delete({
      where: { id: params.id },
    });

    return successResponse({ ok: true });
  } catch (error) {
    console.error('Session deletion error:', error);
    return errorResponse('Failed to delete session', 'INTERNAL_ERROR', 500);
  }
}
```

### 5. Create upload hook for client-side

**File**: `src/features/session/useUploadSession.ts`

```typescript
// Hook for uploading recorded audio to create a new session
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseUploadSessionReturn {
  upload: (blob: Blob, duration: number, topic?: string) => Promise<string>;
  isUploading: boolean;
  error: string | null;
}

export function useUploadSession(): UseUploadSessionReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const upload = async (
    blob: Blob,
    duration: number,
    topic?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('duration', duration.toString());
      formData.append('language', 'en');
      if (topic) {
        formData.append('topic', topic);
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      return data.id;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload session';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, error };
}
```

### 6. Create barrel export for lib utilities

**File**: `src/lib/index.ts`

```typescript
// Barrel export for shared library utilities
export * from './api';
export * from './storage/r2';
```

### 7. Create Prisma client singleton

**File**: `src/lib/db.ts`

```typescript
// Prisma client singleton to prevent multiple instances in development
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 8. Update RecordingPanel to use real upload

**File**: `src/features/recording/RecordingPanel/RecordingPanel.tsx`

```typescript
// Main recording interface — orchestrates timer, button, and upload flow
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { useUploadSession } from '@/features/session/useUploadSession';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import type { RecordingPanelProps } from './RecordingPanel.types';

export function RecordingPanel({ topic }: RecordingPanelProps) {
  const router = useRouter();
  const { state, duration, audioBlob, error: recordError, startRecording, stopRecording, resetRecording } =
    useAudioRecorder();
  const { upload, isUploading, error: uploadError } = useUploadSession();

  const handleUpload = async () => {
    if (!audioBlob) return;

    try {
      const sessionId = await upload(audioBlob, duration, topic);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error('Upload failed:', err);
      // Error is handled by useUploadSession hook
    }
  };

  const error = recordError || uploadError;

  // Browser compatibility check
  if (typeof window !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Browser Not Supported
          </h3>
          <p className="text-sm text-yellow-800">
            Your browser does not support audio recording. Please use a modern
            browser like Chrome, Edge, Firefox, or Safari 14.1+.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      {/* Timer */}
      <SessionTimer seconds={duration} isActive={state === 'recording'} />

      {/* Record Button */}
      <RecordButton
        state={state}
        onStart={startRecording}
        onStop={stopRecording}
        disabled={isUploading}
      />

      {/* Status Messages */}
      <div className="text-center min-h-[60px]">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!error && state === 'idle' && (
          <p className="text-gray-600 text-lg">
            Press the button to start your speaking session
          </p>
        )}

        {!error && state === 'recording' && (
          <p className="text-gray-700 text-lg font-medium">
            Speaking... take your time
          </p>
        )}

        {!error && state === 'stopped' && !isUploading && (
          <div className="space-y-4">
            <p className="text-gray-700 text-lg font-medium">
              Session complete! Ready to upload.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleUpload}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload & Analyze
              </button>
              <button
                onClick={resetRecording}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Discard & Retry
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <p className="text-blue-600 text-lg font-medium">
            Uploading... please wait
          </p>
        )}
      </div>

      {/* Audio preview (optional, for debugging) */}
      {audioBlob && state === 'stopped' && !isUploading && (
        <div className="mt-4">
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-80" />
        </div>
      )}
    </div>
  );
}
```

**File**: `src/features/recording/RecordingPanel/RecordingPanel.types.ts`

```typescript
// RecordingPanel component prop types
export interface RecordingPanelProps {
  topic?: string;
}
```

### 9. Update New Session page with real flow

**File**: `src/app/(app)/session/new/page.tsx`

```typescript
// New recording session page with full recording and upload flow
'use client';

import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';

export default function NewSessionPage() {
  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        New Speaking Session
      </h1>
      <RecordingPanel />
    </Container>
  );
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/lib/storage/r2.ts` | R2 client for audio upload/download/delete |
| `src/lib/api.ts` | Shared API response helpers and validation |
| `src/lib/index.ts` | Barrel export for lib utilities |
| `src/lib/db.ts` | Prisma client singleton |
| `src/app/api/sessions/route.ts` | POST (create) + GET (list) sessions |
| `src/app/api/sessions/[id]/route.ts` | GET (detail) + DELETE session |
| `src/features/session/useUploadSession.ts` | Upload hook for client |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Updated with real upload flow |
| `src/features/recording/RecordingPanel/RecordingPanel.types.ts` | Updated prop types |
| `src/app/(app)/session/new/page.tsx` | Updated to use RecordingPanel without callback |

---

## Definition of Done

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run build` succeeds
- [ ] POST /api/sessions accepts audio upload and creates DB record with status UPLOADED
- [ ] Audio file successfully stored in R2 with correct key format
- [ ] Audio file size validation works (rejects files > 50MB with 413)
- [ ] Audio MIME type validation works (rejects non-audio files)
- [ ] GET /api/sessions returns user's sessions with pagination
- [ ] GET /api/sessions/:id returns session detail with transcript/insights (when available)
- [ ] DELETE /api/sessions/:id removes session + R2 file
- [ ] Unauthorized requests return 401 error
- [ ] Recording → Upload → Redirect flow works end-to-end
- [ ] After successful upload, user redirected to `/session/[id]` page
- [ ] Upload errors displayed to user with retry option
- [ ] User records are auto-created if they don't exist (from externalId)
- [ ] All files have header comments
- [ ] No TypeScript errors or warnings
- [ ] API responses match documented shape (error/success)
