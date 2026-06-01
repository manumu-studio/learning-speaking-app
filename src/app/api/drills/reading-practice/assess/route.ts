// API route: assess pronunciation of a reading practice recording against reference text

import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { env } from '@/lib/env';
import type pino from 'pino';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB

async function postHandler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  if (!validateOrigin(req)) return csrfForbiddenResponse();

  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
    return errorResponse('Azure Speech not configured', 'CONFIG_ERROR', 500);
  }

  const formData = await req.formData();
  const audioFile = formData.get('audio');
  const referenceText = formData.get('referenceText');

  if (!(audioFile instanceof File)) {
    return errorResponse('Missing audio file', 'VALIDATION_ERROR', 400);
  }
  if (typeof referenceText !== 'string' || referenceText.trim().length === 0) {
    return errorResponse('Missing reference text', 'VALIDATION_ERROR', 400);
  }
  if (audioFile.size > MAX_AUDIO_SIZE) {
    return errorResponse('Audio file too large (max 10 MB)', 'VALIDATION_ERROR', 400);
  }

  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const wavBuffer = Buffer.from(arrayBuffer);

    const result = await assessPronunciation(
      wavBuffer,
      referenceText.trim(),
      env.AZURE_SPEECH_KEY,
      env.AZURE_SPEECH_REGION,
    );

    logger.info(
      { userId: authSession.user.externalId, pronScore: result.pronScore, wordCount: result.words.length },
      'Reading practice pronunciation assessed',
    );

    return successResponse({
      pronScore: result.pronScore,
      accuracyScore: result.accuracyScore,
      fluencyScore: result.fluencyScore,
      completenessScore: result.completenessScore,
      prosodyScore: result.prosodyScore,
      words: result.words.map((w) => ({
        word: w.word,
        accuracyScore: w.accuracyScore,
        errorType: w.errorType,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment failed';
    logger.error({ error: message }, 'Reading practice assessment failed');
    return errorResponse(message, 'ASSESSMENT_ERROR', 500);
  }
}

export const POST = withObservability(postHandler, { route: 'drills/reading-practice/assess' });
