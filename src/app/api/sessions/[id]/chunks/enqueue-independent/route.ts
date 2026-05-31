// Enqueues a single chunk into the independent parallel pipeline via QStash
import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { prisma } from '@/lib/prisma';
import { enqueueChunkIndependent } from '@/lib/queue/qstash';
import { SessionStatus } from '@prisma/client';
import { z } from 'zod';

const bodySchema = z.object({
  chunkIndex: z.number().int().min(0),
  durationSecs: z.number().positive(),
  storageKey: z.string().min(1),
  overlapSecs: z.number().min(0),
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

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
    }

    const { chunkIndex, durationSecs, storageKey, overlapSecs } = parsed.data;
    const expectedPrefix = `sessions/${user.id}/${sessionId}/chunks/`;
    if (!storageKey.startsWith(expectedPrefix)) {
      return errorResponse('Invalid storage key', 'VALIDATION_ERROR', 400);
    }

    await prisma.chunkResult.upsert({
      where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
      create: {
        sessionId,
        chunkIndex,
        durationSecs,
        overlapSecs,
        status: 'PENDING',
      },
      update: { status: 'PENDING', durationSecs, overlapSecs },
    });

    if (speakingSession.status === SessionStatus.CREATED) {
      await prisma.speakingSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.UPLOADED },
      });
    }

    await enqueueChunkIndependent({
      sessionId,
      chunkIndex,
      storageKey,
      durationSecs,
      overlapSecs,
    });

    return successResponse({ ok: true, chunkIndex }, 201);
  } catch {
    return errorResponse('Failed to enqueue chunk', 'INTERNAL_ERROR', 500);
  }
}
