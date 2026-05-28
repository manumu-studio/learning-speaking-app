// Chunk enqueue endpoint — validates upload, creates SessionChunk row, publishes QStash job
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { enqueueChunkProcessing } from '@/lib/queue/qstash';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { SessionStatus } from '@prisma/client';
import { z } from 'zod';

const enqueueBodySchema = z.object({
  chunkIndex: z.number().int().min(0),
  durationSecs: z.number().int().min(1),
  storageKey: z.string().min(1),
  overlapSecs: z.number().min(0).default(1.5),
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

    const consented = await hasConsent(user.id, 'AUDIO_STORAGE');
    if (!consented) {
      return errorResponse('Recording consent required', 'CONSENT_REQUIRED', 403);
    }

    const speakingSession = await prisma.speakingSession.findFirst({
      where: { id: sessionId, userId: user.id, isChunked: true },
    });

    if (!speakingSession) {
      return errorResponse('Chunked session not found', 'NOT_FOUND', 404);
    }

    const parsed = enqueueBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
    }

    const { chunkIndex, durationSecs, storageKey, overlapSecs } = parsed.data;
    const expectedPrefix = `sessions/${user.id}/${sessionId}/chunks/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      return errorResponse('Invalid storage key', 'VALIDATION_ERROR', 400);
    }

    await prisma.sessionChunk.upsert({
      where: {
        sessionId_chunkIndex: { sessionId, chunkIndex },
      },
      create: {
        sessionId,
        chunkIndex,
        durationSecs,
        overlapSecs,
        audioUrl: storageKey,
      },
      update: {
        durationSecs,
        overlapSecs,
        audioUrl: storageKey,
      },
    });

    if (speakingSession.status === SessionStatus.CREATED) {
      await prisma.speakingSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.UPLOADED },
      });
    }

    await enqueueChunkProcessing(sessionId, chunkIndex);

    return successResponse({
      sessionId,
      chunkIndex,
      status: 'queued',
    }, 201);
  } catch {
    return errorResponse('Failed to enqueue chunk', 'INTERNAL_ERROR', 500);
  }
}
