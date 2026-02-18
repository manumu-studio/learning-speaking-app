// Session detail (GET) and deletion (DELETE) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { deleteAudio } from '@/lib/storage/r2';
import { successResponse, errorResponse } from '@/lib/api';

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
 * Delete session, R2 audio, and cascaded data
 */
export async function DELETE(
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
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    // Delete audio from R2 if exists and not already deleted
    if (speakingSession.audioUrl && !speakingSession.audioDeletedAt) {
      try {
        await deleteAudio(speakingSession.audioUrl);
      } catch (r2Error) {
        console.warn('Failed to delete audio from R2:', r2Error);
        // Continue with DB deletion even if R2 delete fails
      }
    }

    // Delete session (cascades to transcript and insights via Prisma onDelete: Cascade)
    await prisma.speakingSession.delete({ where: { id } });

    return successResponse({ ok: true });
  } catch (error) {
    console.error('Session deletion error:', error);
    return errorResponse('Failed to delete session', 'INTERNAL_ERROR', 500);
  }
}
