// QStash client for enqueuing async processing jobs
import { Client } from '@upstash/qstash';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Runtime validation — QStash vars are optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure QStash credentials to enable async processing.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _qstashClient: Client | null = null;

function getQStashClient(): Client {
  if (_qstashClient) {
    return _qstashClient;
  }

  const token = requireEnv(env.QSTASH_TOKEN, 'QSTASH_TOKEN');
  _qstashClient = new Client({ token });
  return _qstashClient;
}

async function publishDevJob(
  path: string,
  body: Record<string, unknown>,
): Promise<void> {
  logger.info({ path, ...body }, 'Dev mode — calling local worker');
  await fetch(`${env.APP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((error) => {
    logger.error(
      {
        err: error instanceof Error ? error : new Error('Unknown error'),
        ...body,
      },
      'Dev worker call failed',
    );
  });
}

/**
 * Enqueues a full-session processing job via QStash (or calls the local dev worker in development).
 *
 * In production, publishes to `/api/internal/process` with 3 automatic retries.
 *
 * @param sessionId - The speaking session ID to process.
 */
export async function enqueueProcessing(sessionId: string): Promise<void> {
  if (env.NODE_ENV === 'development') {
    await publishDevJob('/api/dev/process', { sessionId });
    return;
  }

  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process`,
    body: { sessionId },
    retries: 3,
  });
}

/**
 * Enqueues a per-chunk processing job with a failure callback for orphan detection.
 *
 * In production, publishes to `/api/internal/process-chunk` with 3 retries and
 * a `failureCallback` pointing to `/api/internal/chunk-failed`.
 *
 * @param sessionId - The speaking session ID.
 * @param chunkIndex - Zero-based index of the chunk to process.
 */
export async function enqueueChunkProcessing(
  sessionId: string,
  chunkIndex: number,
): Promise<void> {
  const body = { sessionId, chunkIndex };

  if (env.NODE_ENV === 'development') {
    await publishDevJob('/api/dev/process-chunk', body);
    return;
  }

  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process-chunk`,
    body,
    retries: 3,
    failureCallback: `${env.APP_URL}/api/internal/chunk-failed`,
  });
}

/**
 * Enqueues the final aggregation job for a session, deduplicated by session ID.
 *
 * Uses QStash `deduplicationId: 'final-<sessionId>'` to prevent duplicate fan-in jobs
 * when multiple chunks complete in rapid succession.
 *
 * @param sessionId - The speaking session ID to finalize.
 */
export async function enqueueFinalProcessing(sessionId: string): Promise<void> {
  const body = { sessionId };

  if (env.NODE_ENV === 'development') {
    await publishDevJob('/api/dev/process-final', body);
    return;
  }

  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process-final`,
    body,
    retries: 3,
    deduplicationId: `final-${sessionId}`,
  });
}

/**
 * Enqueues an independent per-chunk pipeline job carrying full chunk metadata.
 *
 * Unlike `enqueueChunkProcessing`, this variant is self-contained: the chunk worker
 * receives all timing and storage data it needs without fetching from the DB first.
 *
 * @param payload - Chunk job data: `sessionId`, `chunkIndex`, `storageKey`, `durationSecs`, `overlapSecs`.
 */
export async function enqueueChunkIndependent(payload: {
  sessionId: string;
  chunkIndex: number;
  storageKey: string;
  durationSecs: number;
  overlapSecs: number;
}): Promise<void> {
  if (env.NODE_ENV === 'development') {
    await publishDevJob('/api/dev/process-chunk-independent', payload);
    return;
  }

  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process-chunk-independent`,
    body: payload,
    retries: 3,
  });
}
