// Helpers for POST /api/drills/[id]/complete — audio upload, transcription, drill persistence
import { transcribeAudio } from '@/lib/ai/whisper';
import { gateSegments } from '@/lib/ai/confidenceGating';
import { uploadAudio, deleteAudio } from '@/lib/storage/r2';
import { validateAudioFile, errorResponse } from '@/lib/api';
import { evaluateDrill } from '@/features/training/evaluateDrill';
import { prisma } from '@/lib/prisma';
import { METRIC_LABELS } from '@/features/dashboard/pillars';
import type { DrillType } from '@/features/training/training.types';
import type pino from 'pino';

const DRILL_TYPES: readonly DrillType[] = [
  'rephrase',
  'constraint',
  'vocabUpgrade',
  'precision',
  'conclusion',
];

export function isDrillType(value: string): value is DrillType {
  return (DRILL_TYPES as readonly string[]).includes(value);
}

export function drillAudioKey(userId: string, drillId: string, extension: string): string {
  return `drills/${userId}/${drillId}/audio.${extension}`;
}

export type AudioValidationResult =
  | { valid: true; file: File; audioBlob: Blob; extension: string; contentType: string }
  | { valid: false; response: Response };

/** Validates the audio Blob from FormData and returns a structured result. */
export function validateDrillAudio(audioFile: unknown): AudioValidationResult {
  if (!audioFile || !(audioFile instanceof Blob)) {
    return { valid: false, response: errorResponse('Audio file required', 'MISSING_AUDIO', 400) };
  }

  const audioBlob: Blob = audioFile;
  const file = new File([audioBlob], 'recording.webm', {
    type: audioBlob.type.length > 0 ? audioBlob.type : 'audio/webm',
  });

  const validation = validateAudioFile(file);
  if (!validation.valid) {
    const status = validation.error?.includes('size') ? 413 : 400;
    return { valid: false, response: errorResponse(validation.error ?? 'Invalid file', 'INVALID_FILE', status) };
  }

  const extension =
    file.type.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/gi, '') ?? 'webm';
  const contentType = file.type.length > 0 ? file.type : 'audio/webm';

  return { valid: true, file, audioBlob, extension, contentType };
}

export interface TranscribeResult {
  transcript: string;
}

export interface AudioUploadOptions {
  buffer: Buffer;
  storageKey: string;
  contentType: string;
  drillId: string;
}

/**
 * Uploads audio to R2, transcribes via Whisper with confidence gating,
 * then deletes the audio file. Cleans up on error too.
 */
export async function uploadTranscribeAndCleanup(
  opts: AudioUploadOptions,
  logger: pino.Logger,
): Promise<TranscribeResult> {
  const { buffer, storageKey, contentType, drillId } = opts;
  await uploadAudio(storageKey, buffer, contentType);

  try {
    const whisperResult = await transcribeAudio(buffer, `drill-${drillId}.webm`);
    const gated = gateSegments(whisperResult.segments);
    const transcript = gated.cleanText.length > 0 ? gated.cleanText : whisperResult.text;
    return { transcript };
  } finally {
    try {
      await deleteAudio(storageKey);
    } catch {
      logger.warn({ key: storageKey }, 'Failed to delete drill audio from R2');
    }
  }
}

export interface DrillRecord {
  id: string;
  userId: string;
  drillType: string;
  metricKey: string;
  prompt: string;
  sourceExample: string | null;
  completedAt: Date | null;
}

/** Evaluates the drill transcript and persists the result to the database. */
export async function completeDrillRecord(
  drill: DrillRecord,
  transcript: string,
): Promise<{ id: string; transcript: string | null; feedback: string | null; improved: boolean | null; completedAt: Date | null }> {
  const metricLabel = METRIC_LABELS[drill.metricKey] ?? drill.metricKey;

  if (!isDrillType(drill.drillType)) {
    throw new Error(`Invalid drill type: ${drill.drillType}`);
  }

  const feedbackResult = await evaluateDrill({
    drillType: drill.drillType,
    drillPrompt: drill.prompt,
    sourceExample: drill.sourceExample,
    drillTranscript: transcript,
    metricKey: drill.metricKey,
    metricLabel,
  });

  return prisma.drillAttempt.update({
    where: { id: drill.id },
    data: {
      transcript,
      feedback: feedbackResult.feedback,
      improved: feedbackResult.improved,
      completedAt: new Date(),
    },
  });
}
