// Session creation (POST) and listing (GET) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { uploadAudio, generateAudioKey } from '@/lib/storage/r2';
import { validateAudioFile, successResponse, errorResponse } from '@/lib/api';
import { SessionStatus } from '@prisma/client';
import { enqueueProcessing } from '@/lib/queue/qstash';

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
      const status = validation.error?.includes('size') ? 413 : 400;
      return errorResponse(validation.error ?? 'Invalid file', 'INVALID_FILE', status);
    }

    // Find or create user
    const user = await findOrCreateUser(session.user.externalId, {
      email: session.user.email ?? undefined,
      displayName: session.user.name ?? undefined,
    });

    // Create session record
    const speakingSession = await prisma.speakingSession.create({
      data: {
        userId: user.id,
        status: SessionStatus.CREATED,
        durationSecs: Number(durationSecs),
        language: language ?? 'en',
        topic: topic ?? null,
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
    console.error('Session creation error:', error);
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
    console.error('Session list error:', error);
    return errorResponse('Failed to fetch sessions', 'INTERNAL_ERROR', 500);
  }
}
