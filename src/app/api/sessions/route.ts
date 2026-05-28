// Session creation (POST) and listing (GET) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { uploadAudio, generateAudioKey } from '@/lib/storage/r2';
import { validateAudioFile, successResponse, errorResponse } from '@/lib/api';
import { SessionStatus } from '@prisma/client';
import { enqueueProcessing } from '@/lib/queue/qstash';
import { logger } from '@/lib/logger';
import { SPEAKING_METRIC_KEYS } from '@/lib/metric-keys';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { z } from 'zod';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB — ~6 minutes of webm/opus at ~20 KB/s

const SessionFormDataSchema = z.object({
  audio: z.custom<Blob>(
    (val) => val instanceof Blob,
    { message: 'Audio file is required' },
  ),
  duration: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
    message: 'Valid duration is required',
  }),
  topic: z.string().nullable(),
  language: z.string().nullable(),
  focusMetricKey: z.enum(SPEAKING_METRIC_KEYS).nullable(),
  isOnboarding: z.union([z.literal('true'), z.literal('false')]).nullable(),
  promptUsed: z.string().max(500).nullable(),
});

const ChunkedSessionJsonSchema = z.object({
  chunked: z.literal(true),
  topic: z.string().nullable(),
  language: z.string().nullable().default('en'),
  focusMetricKey: z.enum(SPEAKING_METRIC_KEYS).nullable(),
  isOnboarding: z.boolean().default(false),
  promptUsed: z.string().max(500).nullable(),
});

// Zod schema for session list query params
const SessionListQuerySchema = z.object({
  cursor: z.string().optional(),
  cursorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  dateFilter: z.enum(['7d', '30d', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  isOnboarding: z.enum(['false']).optional(),
});

function getDateCutoff(filter: 'all' | '7d' | '30d'): Date | null {
  if (filter === 'all') return null;
  const days = filter === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function extractWordCount(summary: string | null): number | null {
  if (summary === null) return null;
  try {
    const parsed: unknown = JSON.parse(summary);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'wordCount' in parsed &&
      typeof (parsed as Record<string, unknown>)['wordCount'] === 'number'
    ) {
      return (parsed as Record<string, unknown>)['wordCount'] as number;
    }
    return null;
  } catch {
    return null;
  }
}

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

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const jsonBody: unknown = await request.json();
      const chunkedParsed = ChunkedSessionJsonSchema.safeParse(jsonBody);
      if (!chunkedParsed.success) {
        return errorResponse('Invalid JSON body', 'VALIDATION_ERROR', 400);
      }

      const {
        topic,
        language,
        focusMetricKey,
        isOnboarding,
        promptUsed,
      } = chunkedParsed.data;

      const speakingSession = await prisma.speakingSession.create({
        data: {
          userId: user.id,
          status: SessionStatus.CREATED,
          language: language ?? 'en',
          topic: topic ?? null,
          focusMetricKey,
          isOnboarding,
          promptUsed: promptUsed ?? null,
          isChunked: true,
        },
      });

      return successResponse(
        {
          id: speakingSession.id,
          status: speakingSession.status,
          createdAt: speakingSession.createdAt.toISOString(),
          isChunked: true,
        },
        201,
      );
    }

    const formData = await request.formData();
    const rawAudio = formData.get('audio');
    const rawDuration = formData.get('duration');
    const rawTopic = formData.get('topic');
    const rawLanguage = formData.get('language');
    const rawFocus = formData.get('focusMetricKey');
    const rawIsOnboarding = formData.get('isOnboarding');
    const rawPromptUsed = formData.get('promptUsed');

    const parsed = SessionFormDataSchema.safeParse({
      audio: rawAudio instanceof Blob ? rawAudio : undefined,
      duration: typeof rawDuration === 'string' ? rawDuration : undefined,
      topic: typeof rawTopic === 'string' ? rawTopic : null,
      language: typeof rawLanguage === 'string' ? rawLanguage : null,
      focusMetricKey:
        typeof rawFocus === 'string' && rawFocus.trim() !== ''
          ? rawFocus.trim()
          : null,
      isOnboarding:
        typeof rawIsOnboarding === 'string' && rawIsOnboarding.trim() !== ''
          ? rawIsOnboarding.trim()
          : null,
      promptUsed:
        typeof rawPromptUsed === 'string' && rawPromptUsed.trim() !== ''
          ? rawPromptUsed.trim()
          : null,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid form data';
      return errorResponse(firstError, 'VALIDATION_ERROR', 400);
    }

    const { audio: audioFile, duration: durationStr, topic, language, focusMetricKey, isOnboarding, promptUsed } = parsed.data;

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return errorResponse(
        'Audio file too large. Maximum session length is 6 minutes.',
        'FILE_TOO_LARGE',
        413,
      );
    }

    const validation = validateAudioFile(audioFile);
    if (!validation.valid) {
      const status = validation.error?.includes('size') ? 413 : 400;
      return errorResponse(validation.error ?? 'Invalid file', 'INVALID_FILE', status);
    }

    const speakingSession = await prisma.speakingSession.create({
      data: {
        userId: user.id,
        status: SessionStatus.CREATED,
        durationSecs: Number(durationStr),
        language: language ?? 'en',
        topic: topic ?? null,
        focusMetricKey,
        isOnboarding: isOnboarding === 'true',
        promptUsed: promptUsed ?? null,
      },
    });

    const extension = audioFile.type.split('/')[1]?.split(';')[0] ?? 'webm';
    const storageKey = generateAudioKey(user.id, speakingSession.id, extension);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    await uploadAudio(storageKey, audioBuffer, audioFile.type);

    const updatedSession = await prisma.speakingSession.update({
      where: { id: speakingSession.id },
      data: {
        audioUrl: storageKey,
        status: SessionStatus.UPLOADED,
      },
    });

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
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Session creation failed',
    );
    return errorResponse('Failed to create session', 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET /api/sessions
 * List user's sessions with cursor-based pagination
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
      return successResponse({
        sessions: [],
        nextCursor: null,
        nextCursorId: null,
        total: 0,
      }, 200, { 'Cache-Control': 'private, no-store' });
    }

    const url = new URL(request.url);
    const queryResult = SessionListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!queryResult.success) {
      return errorResponse('Invalid query parameters', 'VALIDATION_ERROR', 400);
    }

    const { cursor, cursorId, limit, dateFilter, isOnboarding: isOnboardingParam } = queryResult.data;
    const excludeOnboarding = isOnboardingParam === 'false';

    const cutoff = getDateCutoff(dateFilter);

    const baseWhere = {
      userId: user.id,
      ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
      ...(excludeOnboarding ? { isOnboarding: false } : {}),
    };

    const cursorWhere =
      cursor !== undefined && cursorId !== undefined
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor) } },
              {
                createdAt: new Date(cursor),
                id: { lt: cursorId },
              },
            ],
          }
        : {};

    const where = { ...baseWhere, ...cursorWhere };

    const sessions = await prisma.speakingSession.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        status: true,
        intentLabel: true,
        topic: true,
        durationSecs: true,
        summary: true,
        createdAt: true,
        metrics: {
          select: { key: true, score: true },
        },
      },
    });

    const hasMore = sessions.length > limit;
    const pageItems = hasMore ? sessions.slice(0, limit) : sessions;

    const sessionsWithWorkout = await Promise.all(
      pageItems.map(async (s) => {
        const workoutNumber = await prisma.speakingSession.count({
          where: { userId: user.id, createdAt: { lte: s.createdAt }, isOnboarding: false },
        });
        return { ...s, workoutNumber };
      }),
    );

    const items = sessionsWithWorkout.map((s) => {
      const snapshots = s.metrics;
      const scores = snapshots.map((snap: { score: number }) => snap.score);
      const overallScore =
        scores.length > 0
          ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
          : null;
      const pronSnapshot = snapshots.find(
        (snap: { key: string; score: number }) => snap.key === 'pronunciationAccuracy',
      );
      const pronunciationScore = pronSnapshot?.score ?? null;

      return {
        id: s.id,
        status: s.status,
        intentLabel: s.intentLabel,
        topic: s.topic,
        durationSecs: s.durationSecs,
        wordCount: extractWordCount(s.summary),
        createdAt: s.createdAt.toISOString(),
        overallScore,
        pronunciationScore,
        workoutNumber: s.workoutNumber,
      };
    });

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem !== undefined ? lastItem.createdAt : null;
    const nextCursorId = hasMore && lastItem !== undefined ? lastItem.id : null;

    const total = await prisma.speakingSession.count({ where: baseWhere });

    return successResponse({
      sessions: items,
      nextCursor,
      nextCursorId,
      total,
    }, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Session list failed',
    );
    return errorResponse('Failed to fetch sessions', 'INTERNAL_ERROR', 500);
  }
}
