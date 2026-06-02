// Helper handlers for POST /api/sessions — chunked and form-data branches
import { prisma } from '@/lib/prisma';
import { uploadAudio, generateAudioKey } from '@/lib/storage/r2';
import { validateAudioFile, successResponse, errorResponse } from '@/lib/api';
import { SessionStatus } from '@prisma/client';
import { enqueueProcessing } from '@/lib/queue/qstash';
import type pino from 'pino';
import {
  SessionFormDataSchema,
  ChunkedSessionJsonSchema,
} from './sessionSchemas';

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB — ~6 minutes of webm/opus at ~20 KB/s

/** Handle the JSON (chunked) branch of POST /api/sessions */
export async function handleChunkedSession(
  req: Request,
  userId: string,
): Promise<Response> {
  const jsonBody: unknown = await req.json();
  const chunkedParsed = ChunkedSessionJsonSchema.safeParse(jsonBody);
  if (!chunkedParsed.success) {
    return errorResponse('Invalid JSON body', 'VALIDATION_ERROR', 400);
  }

  const { topic, language, focusMetricKey, isOnboarding, promptUsed } =
    chunkedParsed.data;

  const speakingSession = await prisma.speakingSession.create({
    data: {
      userId,
      status: SessionStatus.CREATED,
      language: language ?? 'en',
      topic: topic ?? null,
      focusMetricKey,
      isOnboarding,
      promptUsed: promptUsed ?? null,
      isChunked: true,
    },
  });

  return successResponse(
    {
      id: speakingSession.id,
      status: speakingSession.status,
      createdAt: speakingSession.createdAt.toISOString(),
      isChunked: true,
    },
    201,
  );
}

/** Parse and validate the multipart form-data fields for POST /api/sessions */
function parseFormData(formData: FormData) {
  const rawAudio = formData.get('audio');
  const rawDuration = formData.get('duration');
  const rawTopic = formData.get('topic');
  const rawLanguage = formData.get('language');
  const rawFocus = formData.get('focusMetricKey');
  const rawIsOnboarding = formData.get('isOnboarding');
  const rawPromptUsed = formData.get('promptUsed');

  return SessionFormDataSchema.safeParse({
    audio: rawAudio instanceof Blob ? rawAudio : undefined,
    duration: typeof rawDuration === 'string' ? rawDuration : undefined,
    topic: typeof rawTopic === 'string' ? rawTopic : null,
    language: typeof rawLanguage === 'string' ? rawLanguage : null,
    focusMetricKey:
      typeof rawFocus === 'string' && rawFocus.trim() !== ''
        ? rawFocus.trim()
        : null,
    isOnboarding:
      typeof rawIsOnboarding === 'string' && rawIsOnboarding.trim() !== ''
        ? rawIsOnboarding.trim()
        : null,
    promptUsed:
      typeof rawPromptUsed === 'string' && rawPromptUsed.trim() !== ''
        ? rawPromptUsed.trim()
        : null,
  });
}

/** Handle the multipart form-data branch of POST /api/sessions */
export async function handleFormDataSession(
  req: Request,
  userId: string,
  logger: pino.Logger,
): Promise<Response> {
  const formData = await req.formData();
  const parsed = parseFormData(formData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid form data';
    return errorResponse(firstError, 'VALIDATION_ERROR', 400);
  }

  const {
    audio: audioFile,
    duration: durationStr,
    topic,
    language,
    focusMetricKey,
    isOnboarding,
    promptUsed,
  } = parsed.data;

  if (audioFile.size > MAX_AUDIO_BYTES) {
    return errorResponse(
      'Audio file too large. Maximum session length is 6 minutes.',
      'FILE_TOO_LARGE',
      413,
    );
  }

  const validation = validateAudioFile(audioFile);
  if (!validation.valid) {
    const status = validation.error?.includes('size') ? 413 : 400;
    return errorResponse(
      validation.error ?? 'Invalid file',
      'INVALID_FILE',
      status,
    );
  }

  const speakingSession = await prisma.speakingSession.create({
    data: {
      userId,
      status: SessionStatus.CREATED,
      durationSecs: Number(durationStr),
      language: language ?? 'en',
      topic: topic ?? null,
      focusMetricKey,
      isOnboarding: isOnboarding === 'true',
      promptUsed: promptUsed ?? null,
    },
  });

  const extension = audioFile.type.split('/')[1]?.split(';')[0] ?? 'webm';
  const storageKey = generateAudioKey(userId, speakingSession.id, extension);
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  await uploadAudio(storageKey, audioBuffer, audioFile.type);

  const updatedSession = await prisma.speakingSession.update({
    where: { id: speakingSession.id },
    data: { audioUrl: storageKey, status: SessionStatus.UPLOADED },
  });

  await enqueueProcessing(updatedSession.id);

  logger.info({ sessionId: updatedSession.id }, 'Session created and enqueued');

  return successResponse(
    {
      id: updatedSession.id,
      status: updatedSession.status,
      createdAt: updatedSession.createdAt.toISOString(),
      estimatedWaitSecs: 30,
    },
    201,
  );
}
