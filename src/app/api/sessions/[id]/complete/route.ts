// Marks a chunked session complete and sets expected chunk count for fan-in
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { ChunkStatus, SessionStatus } from '@prisma/client';
import { maybeEnqueueFinalProcessing } from '@/lib/pipeline/processChunk';
import { z } from 'zod';

const completeBodySchema = z.object({
  chunkCount: z.number().int().min(1),
  durationSecs: z.number().int().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;

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

    const speakingSession = await prisma.speakingSession.findFirst({
      where: { id: sessionId, userId: user.id, isChunked: true },
    });

    if (!speakingSession) {
      return errorResponse('Chunked session not found', 'NOT_FOUND', 404);
    }

    const parsed = completeBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
    }

    const { chunkCount, durationSecs } = parsed.data;

    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        chunkCount,
        durationSecs,
        status: SessionStatus.CHUNKS_PROCESSING,
      },
    });

    const doneCount = await prisma.sessionChunk.count({
      where: { sessionId, status: ChunkStatus.CHUNK_DONE },
    });

    if (doneCount === chunkCount) {
      await maybeEnqueueFinalProcessing(sessionId);
    }

    return successResponse({
      sessionId,
      chunkCount,
      status: doneCount === chunkCount ? 'finalizing' : 'processing',
      estimatedWaitSecs: 30,
    });
  } catch {
    return errorResponse('Failed to complete session', 'INTERNAL_ERROR', 500);
  }
}
