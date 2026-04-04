// Session creation (POST) and listing (GET) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { uploadAudio, generateAudioKey } from '@/lib/storage/r2';
import { validateAudioFile, successResponse, errorResponse } from '@/lib/api';
import { SessionStatus } from '@prisma/client';
import { enqueueProcessing } from '@/lib/queue/qstash';
import { log } from '@/lib/logger';
import { SPEAKING_METRIC_KEYS } from '@/lib/metric-keys';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { z } from 'zod';

// Zod schema for session creation FormData
const SessionFormDataSchema = z.object({
  audio: z.custom<File>(
    (val) => typeof File !== 'undefined' && val instanceof File,
    { message: 'Audio file is required' },
  ),
  duration: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
    message: 'Valid duration is required',
  }),
  topic: z.string().nullable(),
  language: z.string().nullable(),
  focusMetricKey: z
    .enum(SPEAKING_METRIC_KEYS)
    .nullable(),
});

/**
 * POST /api/sessions
 * Create new speaking session and upload audio to R2
 */
export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!validateOrigin(request)) {
      return csrfForbiddenResponse();
    }

    const user = await findOrCreateUser(session.user.externalId, {
      email: session.user.email ?? undefined,
      displayName: session.user.name ?? undefined,
    });

    const consented = await hasConsent(user.id, 'AUDIO_STORAGE');
    if (!consented) {
      return errorResponse('Recording consent required', 'CONSENT_REQUIRED', 403);
    }

    // Parse and validate multipart form data through Zod
    const formData = await request.formData();
    const rawAudio = formData.get('audio');
    const rawDuration = formData.get('duration');
    const rawTopic = formData.get('topic');
    const rawLanguage = formData.get('language');
    const rawFocus = formData.get('focusMetricKey');

    const parsed = SessionFormDataSchema.safeParse({
      audio: rawAudio instanceof File ? rawAudio : undefined,
      duration: typeof rawDuration === 'string' ? rawDuration : undefined,
      topic: typeof rawTopic === 'string' ? rawTopic : null,
      language: typeof rawLanguage === 'string' ? rawLanguage : null,
      focusMetricKey:
        typeof rawFocus === 'string' && rawFocus.trim() !== ''
          ? rawFocus.trim()
          : null,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid form data';
      return errorResponse(firstError, 'VALIDATION_ERROR', 400);
    }

    const { audio: audioFile, duration: durationStr, topic, language, focusMetricKey } = parsed.data;

    // Validate audio file
    const validation = validateAudioFile(audioFile);
    if (!validation.valid) {
      const status = validation.error?.includes('size') ? 413 : 400;
      return errorResponse(validation.error ?? 'Invalid file', 'INVALID_FILE', status);
    }

    // Create session record
    const speakingSession = await prisma.speakingSession.create({
      data: {
        userId: user.id,
        status: SessionStatus.CREATED,
        durationSecs: Number(durationStr),
        language: language ?? 'en',
        topic: topic ?? null,
        focusMetricKey,
      },
    });

    // Upload audio to R2
    const extension = audioFile.type.split('/')[1]?.split(';')[0] ?? 'webm';
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

    // Trigger QStash processing pipeline
    await enqueueProcessing(updatedSession.id);

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
    log({
      level: 'error',
      message: 'Session creation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to create session', 'INTERNAL_ERROR', 500);
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
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '10')));
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
          intentLabel: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.speakingSession.count({
        where: { userId: user.id },
      }),
    ]);

    return successResponse({ sessions, total, page, limit });
  } catch (error) {
    log({
      level: 'error',
      message: 'Session list failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to fetch sessions', 'INTERNAL_ERROR', 500);
  }
}
