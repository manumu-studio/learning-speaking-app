// HTTP client for the Praat parselmouth contour microservice
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { ContourData } from '@/lib/praat/praat.types';
import { ContourDataSchema, ExtractResponseSchema } from '@/lib/praat/schemas';

const EXTRACT_TIMEOUT_MS = 30_000;

function mapContourPayload(payload: {
  frame_ms: number;
  f0_hz: number[];
  intensity_db: number[];
  voiced: boolean[];
  duration_ms: number;
}): ContourData {
  return {
    frameMs: payload.frame_ms,
    f0Hz: payload.f0_hz,
    intensityDb: payload.intensity_db,
    voiced: payload.voiced,
    durationMs: payload.duration_ms,
  };
}

export async function extractContour(
  audioUrl: string,
  durationSecs: number,
): Promise<ContourData | null> {
  const serviceUrl = env.PRAAT_SERVICE_URL;
  const apiKey = env.PRAAT_API_KEY;

  if (serviceUrl === undefined || apiKey === undefined) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const response = await fetch(`${serviceUrl}/api/v1/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        duration_secs: durationSecs,
        sample_rate: 16_000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, durationSecs },
        'Praat service returned non-OK status',
      );
      return null;
    }

    const json: unknown = await response.json();
    const parsed = ExtractResponseSchema.safeParse(json);
    if (!parsed.success || parsed.data.status !== 'ok' || parsed.data.contour == null) {
      logger.warn(
        { durationSecs, error: parsed.success ? parsed.data.error : 'invalid response' },
        'Praat contour extraction failed',
      );
      return null;
    }

    const contourParsed = ContourDataSchema.safeParse(parsed.data.contour);
    if (!contourParsed.success) {
      logger.warn({ durationSecs }, 'Praat contour payload failed validation');
      return null;
    }

    return mapContourPayload(contourParsed.data);
  } catch (error) {
    logger.warn(
      {
        durationSecs,
        err: error instanceof Error ? error : new Error('Unknown error'),
      },
      'Praat service request failed',
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
