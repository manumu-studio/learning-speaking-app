// API route: Complete a drill — upload audio, transcribe, evaluate, return feedback
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import {
  isDrillType,
  drillAudioKey,
  validateDrillAudio,
  uploadTranscribeAndCleanup,
  completeDrillRecord,
} from './drillCompleteHelpers';

async function handler(request: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!validateOrigin(request)) {
    return csrfForbiddenResponse();
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  // Extract drill id from URL path: /api/drills/[id]/complete
  const pathParts = new URL(request.url).pathname.split('/');
  const id = pathParts.at(-2) ?? '';

  const drill = await prisma.drillAttempt.findUnique({ where: { id } });

  if (!drill || drill.userId !== user.id) {
    return errorResponse('Not found', 'NOT_FOUND', 404);
  }

  if (drill.completedAt) {
    return errorResponse('Drill already completed', 'CONFLICT', 409);
  }

  if (!isDrillType(drill.drillType)) {
    return errorResponse('Invalid drill type', 'INVALID_DRILL', 400);
  }

  const formData = await request.formData();
  const audioValidation = validateDrillAudio(formData.get('audio'));
  if (!audioValidation.valid) {
    return audioValidation.response;
  }

  const { audioBlob, extension, contentType } = audioValidation;
  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
  const storageKey = drillAudioKey(user.id, id, extension);

  const { transcript } = await uploadTranscribeAndCleanup(
    { buffer: audioBuffer, storageKey, contentType, drillId: id },
    logger,
  );

  const updatedDrill = await completeDrillRecord(drill, transcript);

  return successResponse({
    id: updatedDrill.id,
    transcript: updatedDrill.transcript,
    feedback: updatedDrill.feedback,
    improved: updatedDrill.improved,
    completedAt: updatedDrill.completedAt,
  });
}

export const POST = withObservability(handler, { route: 'drills/[id]/complete' });
