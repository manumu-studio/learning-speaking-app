// QStash client for enqueuing async processing jobs
import { Client } from '@upstash/qstash';
import { env } from '@/lib/env';
import { log } from '@/lib/logger';

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
  log({ level: 'info', message: 'Dev mode — calling local worker', metadata: { path, ...body } });
  await fetch(`${env.APP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((error) => {
    log({
      level: 'error',
      message: 'Dev worker call failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: body,
    });
  });
}

// Enqueue session processing job via QStash
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
  });
}

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
  });
}
