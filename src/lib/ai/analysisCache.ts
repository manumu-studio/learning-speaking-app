// Redis-backed cache for Claude analysis results, keyed by SHA-256 hash of transcript
import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { analysisResultSchema, type AnalysisResult } from '@/lib/ai/analyze';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const CACHE_VERSION = 'v1';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

const CachedAnalysisSchema = z.object({
  result: analysisResultSchema,
  cachedAt: z.string().datetime(),
});

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
    } catch {
      return null;
    }
  }

  return redisClient;
}

function buildCacheKey(transcriptHash: string): string {
  return `lsa:analysis:${CACHE_VERSION}:${transcriptHash}`;
}

/**
 * Returns a SHA-256 hex digest of a transcript string for use as a cache key.
 *
 * @param transcript - The raw transcript text.
 * @returns A 64-character lowercase hex string.
 */
export function hashTranscript(transcript: string): string {
  return createHash('sha256').update(transcript).digest('hex');
}

/**
 * Fetches a previously cached analysis result for the given transcript hash.
 *
 * Returns `null` on cache miss, Redis unavailability, or schema validation failure —
 * callers should treat `null` as a miss and proceed with a fresh Claude call.
 *
 * @param transcriptHash - SHA-256 hex digest returned by {@link hashTranscript}.
 * @returns The cached `AnalysisResult`, or `null` if not found or on any error.
 */
export async function getCachedAnalysis(
  transcriptHash: string,
): Promise<AnalysisResult | null> {
  const redis = getRedisClient();
  if (redis === null) {
    return null;
  }

  try {
    const raw = await redis.get<string>(buildCacheKey(transcriptHash));
    if (raw === null) {
      return null;
    }

    const payload: unknown =
      typeof raw === 'string' ? JSON.parse(raw) : raw;

    const parsed = CachedAnalysisSchema.safeParse(payload);
    if (!parsed.success) {
      return null;
    }

    return parsed.data.result;
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Failed to read analysis cache',
    );
    return null;
  }
}

/**
 * Stores an analysis result in Redis keyed by transcript hash with a 7-day TTL.
 *
 * Failures are logged as warnings and swallowed — caching is best-effort and must
 * not block the pipeline on Redis outages.
 *
 * @param transcriptHash - SHA-256 hex digest returned by {@link hashTranscript}.
 * @param result - Validated `AnalysisResult` to persist.
 */
export async function setCachedAnalysis(
  transcriptHash: string,
  result: AnalysisResult,
): Promise<void> {
  const redis = getRedisClient();
  if (redis === null) {
    return;
  }

  try {
    const payload = JSON.stringify({
      result,
      cachedAt: new Date().toISOString(),
    });

    await redis.set(buildCacheKey(transcriptHash), payload, {
      ex: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Failed to write analysis cache',
    );
  }
}
