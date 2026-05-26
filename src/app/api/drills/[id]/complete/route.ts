// API route: Complete a drill — upload audio, transcribe, evaluate, return feedback

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { transcribeAudio } from '@/lib/ai/whisper';
import { gateSegments } from '@/lib/ai/confidenceGating';
import { evaluateDrill } from '@/features/training/evaluateDrill';
import type { DrillType } from '@/features/training/training.types';
import { uploadAudio, deleteAudio } from '@/lib/storage/r2';
import { validateAudioFile, errorResponse, successResponse } from '@/lib/api';
import { log } from '@/lib/logger';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';

const DRILL_TYPES: readonly DrillType[] = [
  'rephrase',
  'constraint',
  'vocabUpgrade',
  'precision',
  'conclusion',
];

function isDrillType(value: string): value is DrillType {
  return (DRILL_TYPES as readonly string[]).includes(value);
}

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

function drillAudioKey(userId: string, drillId: string, extension: string): string {
  return `drills/${userId}/${drillId}/audio.${extension}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;

    const drill = await prisma.drillAttempt.findUnique({
      where: { id },
    });

    if (!drill || drill.userId !== user.id) {
      return errorResponse('Not found', 'NOT_FOUND', 404);
    }

    if (drill.completedAt) {
      return errorResponse('Drill already completed', 'CONFLICT', 409);
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return errorResponse('Audio file required', 'MISSING_AUDIO', 400);
    }

    const audioBlob: Blob = audioFile;
    const fileForValidation = new File([audioBlob], 'recording.webm', {
      type: audioBlob.type.length > 0 ? audioBlob.type : 'audio/webm',
    });

    const validation = validateAudioFile(fileForValidation);
    if (!validation.valid) {
      const status = validation.error?.includes('size') ? 413 : 400;
      return errorResponse(validation.error ?? 'Invalid file', 'INVALID_FILE', status);
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const extension =
      fileForValidation.type.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/gi, '') || 'webm';
    const storageKey = drillAudioKey(user.id, id, extension);
    const contentType = fileForValidation.type || 'audio/webm';

    await uploadAudio(storageKey, audioBuffer, contentType);

    let transcript: string;
    try {
      const whisperResult = await transcribeAudio(audioBuffer, `drill-${id}.webm`);
      const gated = gateSegments(whisperResult.segments);
      transcript =
        gated.cleanText.length > 0 ? gated.cleanText : whisperResult.text;
    } finally {
      try {
        await deleteAudio(storageKey);
      } catch {
        log({
          level: 'warn',
          message: 'Failed to delete drill audio from R2',
          metadata: { key: storageKey },
        });
      }
    }

    const metricLabel = METRIC_LABELS[drill.metricKey] ?? drill.metricKey;
    if (!isDrillType(drill.drillType)) {
      return errorResponse('Invalid drill type', 'INVALID_DRILL', 400);
    }
    const feedbackResult = await evaluateDrill({
      drillType: drill.drillType,
      drillPrompt: drill.prompt,
      sourceExample: drill.sourceExample,
      drillTranscript: transcript,
      metricKey: drill.metricKey,
      metricLabel,
    });

    const updatedDrill = await prisma.drillAttempt.update({
      where: { id },
      data: {
        transcript,
        feedback: feedbackResult.feedback,
        improved: feedbackResult.improved,
        completedAt: new Date(),
      },
    });

    return successResponse({
      id: updatedDrill.id,
      transcript: updatedDrill.transcript,
      feedback: updatedDrill.feedback,
      improved: updatedDrill.improved,
      completedAt: updatedDrill.completedAt,
    });
  } catch (error) {
    log({
      level: 'error',
      message: 'Drill complete failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to complete drill', 'INTERNAL_ERROR', 500);
  }
}
