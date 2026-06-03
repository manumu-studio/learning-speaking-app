// Lazy-singleton AssemblyAI client — server-only, constructed on first use.
import { AssemblyAI } from 'assemblyai';
import { env } from '@/lib/env';

// Lazy singleton — initialized on first use to avoid build-time crashes.
let _client: AssemblyAI | null = null;

/**
 * Returns the shared AssemblyAI client, constructing it on first call.
 *
 * The API key is server-only; never import this module into browser/mobile code.
 *
 * @returns The memoized `AssemblyAI` instance.
 * @throws If `ASSEMBLYAI_API_KEY` is not configured at runtime.
 */
export function getAssemblyAIClient(): AssemblyAI {
  if (_client) return _client;

  const apiKey = env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing required environment variable: ASSEMBLYAI_API_KEY. Configure it to enable verbatim transcription.',
    );
  }

  _client = new AssemblyAI({ apiKey });
  return _client;
}
