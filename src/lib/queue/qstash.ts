// QStash client for enqueuing async processing jobs
import { Client } from '@upstash/qstash';
import { env } from '@/lib/env';

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

// Enqueue session processing job via QStash
export async function enqueueProcessing(sessionId: string): Promise<void> {
  // QStash can't reach localhost — use local dev pipeline instead
  if (env.NODE_ENV === 'development') {
    console.log(`[qstash] Dev mode — calling local pipeline for session ${sessionId}`);
    // Fire-and-forget: don't await so the upload response returns immediately
    // The dev pipeline runs synchronously on its own and updates session status
    fetch(`${env.APP_URL}/api/dev/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch((error) => {
      console.error(`[qstash] Dev pipeline call failed:`, error);
    });
    return;
  }

  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process`,
    body: { sessionId },
    retries: 3,
  });
}
