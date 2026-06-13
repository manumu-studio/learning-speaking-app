// Redis-backed cache for Claude analysis results, keyed by SHA-256 of transcript + prompt + model
import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { analysisResultSchema, type AnalysisResult } from '@/lib/ai/analyze';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const CACHE_VERSION = 'v2';
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

/**
 * Builds a namespaced Redis key from the transcript hash, prompt hash, and model pin.
 * Folding the prompt + model into the key means a shipped prompt or model change no longer
 * serves a stale score for the 7-day TTL — old keys simply miss and repopulate.
 */
function buildCacheKey(transcriptHash: string, promptHash: string, modelPin: string): string {
  return `lsa:analysis:${CACHE_VERSION}:${transcriptHash}:${promptHash}:${modelPin}`;
}

/**
 * Returns a SHA-256 hex digest of a transcript string for use as part of the cache key.
 *
 * @param transcript - The raw transcript text.
 * @returns A 64-character lowercase hex string.
 */
export function hashTranscript(transcript: string): string {
  return createHash('sha256').update(transcript).digest('hex');
}

/**
 * Returns a SHA-256 hex digest of the combined system + user prompt string.
 * Must be called with the concatenation of buildSystemPrompt() and buildUserPrompt() outputs
 * so that a change to either the system prompt or any user prompt section
 * (focus instruction, corpus block, pronunciation context) busts the cache.
 *
 * @param prompt - The concatenated system+user prompt string (systemPrompt + userPrompt).
 * @returns A 64-character lowercase hex string.
 */
export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}

/**
 * Fetches a previously cached analysis result for the given transcript, prompt, and model combination.
 *
 * Returns `null` on cache miss, Redis unavailability, or schema validation failure —
 * callers should treat `null` as a miss and proceed with a fresh Claude call.
 *
 * @param transcriptHash - SHA-256 hex digest returned by {@link hashTranscript}.
 * @param promptHash - SHA-256 hex digest returned by {@link hashPrompt}.
 * @param modelPin - The exact model ID string passed to the Anthropic client.
 * @returns The cached `AnalysisResult`, or `null` if not found or on any error.
 */
export async function getCachedAnalysis(
  transcriptHash: string,
  promptHash: string,
  modelPin: string,
): Promise<AnalysisResult | null> {
  const redis = getRedisClient();
  if (redis === null) {
    return null;
  }

  try {
    const raw = await redis.get<string>(buildCacheKey(transcriptHash, promptHash, modelPin));
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
 * Stores an analysis result in Redis keyed by transcript hash, prompt hash, and model pin,
 * with a 7-day TTL.
 *
 * Failures are logged as warnings and swallowed — caching is best-effort and must
 * not block the pipeline on Redis outages.
 *
 * @param transcriptHash - SHA-256 hex digest returned by {@link hashTranscript}.
 * @param promptHash - SHA-256 hex digest returned by {@link hashPrompt}.
 * @param modelPin - The exact model ID string passed to the Anthropic client.
 * @param result - Validated `AnalysisResult` to persist.
 */
export async function setCachedAnalysis(
  transcriptHash: string,
  promptHash: string,
  modelPin: string,
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

    await redis.set(buildCacheKey(transcriptHash, promptHash, modelPin), payload, {
      ex: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Failed to write analysis cache',
    );
  }
}
