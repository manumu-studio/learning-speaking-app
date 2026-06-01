// Shared lazy Anthropic client for Haiku-powered features (analysis, drills)
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure Anthropic credentials to enable AI features.`
    );
  }
  return value;
}

let _anthropicClient: Anthropic | null = null;

/** Returns the shared Anthropic client singleton, initializing it on first call. */
export function getAnthropicClient(): Anthropic {
  if (_anthropicClient) {
    return _anthropicClient;
  }

  const apiKey = requireEnv(env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY');
  _anthropicClient = new Anthropic({ apiKey });
  return _anthropicClient;
}
