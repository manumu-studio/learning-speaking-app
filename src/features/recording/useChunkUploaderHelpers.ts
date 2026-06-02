// Helper functions for chunk upload operations (presign → R2 PUT → enqueue)
import { z } from 'zod';

const errorSchema = z.object({ error: z.string() });

export const presignSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
  chunkIndex: z.number(),
});

export const enqueueSchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number(),
  status: z.string(),
});

export async function parseError(response: Response): Promise<string> {
  try {
    const data = errorSchema.parse(await response.json());
    return data.error;
  } catch {
    return 'Upload failed';
  }
}

export interface ChunkUploadParams {
  sessionId: string;
  chunkIndex: number;
  wavBlob: Blob;
  durationSecs: number;
}

export interface PresignResult {
  uploadUrl: string;
  storageKey: string;
  chunkIndex: number;
}

export async function presignChunk(
  sessionId: string,
  chunkIndex: number,
  signal?: AbortSignal,
): Promise<PresignResult> {
  const response = await fetch(`/api/sessions/${sessionId}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunkIndex }),
    ...(signal !== undefined ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return presignSchema.parse(await response.json());
}

export async function putChunkToStorage(
  uploadUrl: string,
  wavBlob: Blob,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/wav' },
    body: wavBlob,
    ...(signal !== undefined ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error('Failed to upload chunk to storage');
  }
}

export async function enqueueChunk(
  sessionId: string,
  params: { chunkIndex: number; durationSecs: number; storageKey: string },
  endpoint: 'enqueue' | 'enqueue-independent',
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/chunks/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chunkIndex: params.chunkIndex,
      durationSecs: Math.max(1, Math.round(params.durationSecs)),
      storageKey: params.storageKey,
      overlapSecs: params.chunkIndex === 0 ? 0 : 5,
    }),
    ...(signal !== undefined ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  enqueueSchema.parse(await response.json());
}
