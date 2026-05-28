// Session detail (GET) and deletion (DELETE) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { deleteAudio } from '@/lib/storage/r2';
import { successResponse, errorResponse } from '@/lib/api';
import { log } from '@/lib/logger';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';

/**
 * GET /api/sessions/:id
 * Fetch session details with transcript and insights
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      where: { id, userId: user.id },
      include: {
        transcript: true,
        insights: { orderBy: { severity: 'desc' } },
        metrics: { orderBy: { key: 'asc' } },
        pronunciationReport: {
          select: {
            pronScore: true,
            accuracyScore: true,
            fluencyScore: true,
            completenessScore: true,
            prosodyScore: true,
            speakingRateWpm: true,
            failureReason: true,
            words: {
              select: {
                word: true,
                accuracyScore: true,
                errorType: true,
                offsetMs: true,
                durationMs: true,
                phonemes: true,
                l1Tags: true,
                breakErrorTypes: true,
                intonationErrorTypes: true,
                monotonePitchDelta: true,
              },
              orderBy: { wordIndex: 'asc' },
            },
          },
        },
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            chunkIndex: true,
            durationSecs: true,
            transcriptText: true,
            wordCount: true,
            accuracyScore: true,
            fluencyScore: true,
            prosodyScore: true,
            pronScore: true,
            status: true,
          },
        },
      },
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    const workoutNumber = await prisma.speakingSession.count({
      where: {
        userId: user.id,
        status: 'DONE',
        createdAt: { lte: speakingSession.createdAt },
      },
    });

    return successResponse({ ...speakingSession, workoutNumber });
  } catch (error) {
    log({
      level: 'error',
      message: 'Session fetch failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to fetch session', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete session, R2 audio, and cascaded data
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!validateOrigin(request)) {
      return csrfForbiddenResponse();
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
    });

    if (!user) {
      return errorResponse('User not found', 'USER_NOT_FOUND', 404);
    }

    const speakingSession = await prisma.speakingSession.findFirst({
      where: { id, userId: user.id },
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    // Delete audio from R2 if exists and not already deleted
    if (speakingSession.audioUrl && !speakingSession.audioDeletedAt) {
      try {
        await deleteAudio(speakingSession.audioUrl);
      } catch (r2Error) {
        log({
          level: 'warn',
          message: 'Failed to delete audio from R2',
          error: r2Error instanceof Error ? r2Error.message : 'Unknown error',
        });
      }
    }

    // Delete session (cascades to transcript and insights via Prisma onDelete: Cascade)
    await prisma.speakingSession.delete({ where: { id } });

    return successResponse({ ok: true });
  } catch (error) {
    log({
      level: 'error',
      message: 'Session deletion failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to delete session', 'INTERNAL_ERROR', 500);
  }
}
