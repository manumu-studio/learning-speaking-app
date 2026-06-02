// Helpers for the dev/process-final route — retry polling logic extracted for max-depth compliance
import { processParallelFinal } from '@/lib/pipeline/processFinal';
import { logger } from '@/lib/logger';

const MAX_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 10_000;

/** Attempts one iteration; returns true when done, false when chunks are still processing. */
async function attemptParallelFinal(sessionId: string): Promise<boolean> {
  try {
    await processParallelFinal(sessionId);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('still processing')) {
      return false;
    }
    throw err;
  }
}

/** Polls processParallelFinal until it succeeds or max attempts is exhausted. */
export async function pollParallelFinal(sessionId: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const done = await attemptParallelFinal(sessionId);
    if (done) return;

    if (attempt < MAX_ATTEMPTS) {
      logger.info({ sessionId, attempt, maxAttempts: MAX_ATTEMPTS }, 'Chunks still processing — polling');
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    } else {
      throw new Error('Max polling attempts reached without completion');
    }
  }
}
