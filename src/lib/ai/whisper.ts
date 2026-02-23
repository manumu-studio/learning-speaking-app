// OpenAI Whisper client for speech-to-text transcription
import { File as NodeFile } from 'node:buffer';
import OpenAI, { toFile } from 'openai';
import { env } from '@/lib/env';

// Node.js 18 has File in node:buffer but not as a global — polyfill for OpenAI SDK
if (typeof globalThis.File === 'undefined') {
  (globalThis as Record<string, unknown>).File = NodeFile;
}

// Runtime validation — OPENAI_API_KEY is optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure OpenAI credentials to enable transcription.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_openaiClient) {
    return _openaiClient;
  }

  const apiKey = requireEnv(env.OPENAI_API_KEY, 'OPENAI_API_KEY');
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}

// Transcribe audio using Whisper API — audioBuffer as Buffer, filename for MIME inference
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  const client = getOpenAIClient();

  // toFile handles Buffer → File conversion without relying on Node.js global File (unavailable in Node 18)
  const file = await toFile(audioBuffer, filename, { type: 'audio/webm' });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
  });

  return response.text;
}
