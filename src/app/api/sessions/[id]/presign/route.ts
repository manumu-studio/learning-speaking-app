// Pre-signed R2 PUT URL endpoint for direct browser chunk upload
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { generateChunkAudioKey, generatePresignedPutUrl } from '@/lib/storage/r2';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { z } from 'zod';

const presignBodySchema = z.object({
  chunkIndex: z.number().int().min(0),
});

async function postHandler(
  req: Request,
  { logger: _logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await routeCtx.params;

  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!validateOrigin(req)) {
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

  const parsed = presignBodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
  }

  const { chunkIndex } = parsed.data;
  const storageKey = generateChunkAudioKey(user.id, sessionId, chunkIndex);
  const uploadUrl = await generatePresignedPutUrl(storageKey, 'audio/wav');

  return successResponse({
    uploadUrl,
    storageKey,
    chunkIndex,
    expiresInSecs: 300,
  });
}

export const POST = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => postHandler(r, obsCtx, routeCtx),
    { route: 'sessions/[id]/presign' },
  )(req);
