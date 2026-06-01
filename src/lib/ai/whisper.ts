// OpenAI Whisper client for speech-to-text transcription with verbose_json confidence segments
import { File as NodeFile } from 'node:buffer';
import OpenAI, { toFile } from 'openai';
import { env } from '@/lib/env';
import {
  whisperVerboseResponseSchema,
  whisperVerboseWithWordsSchema,
  type WhisperVerboseResult,
} from '@/lib/ai/whisper.types';

// Node.js 18 has File in node:buffer but not as a global — polyfill for OpenAI SDK
if (typeof globalThis.File === 'undefined') {
  Object.defineProperty(globalThis, 'File', { value: NodeFile, writable: true, configurable: true });
}

const WHISPER_DOMAIN_PROMPT =
  'The speaker is a software engineer discussing API integration, debugging, and deployment. ' +
  'Likely terms: JSON, API, Anthropic, Claude, OpenAI, Whisper, OAuth, PostgreSQL, TypeScript, ' +
  'React, Docker, Kubernetes.';

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

function parseVerboseResponse(raw: unknown): WhisperVerboseResult {
  const parsed = whisperVerboseResponseSchema.parse(raw);
  return {
    text: parsed.text,
    language: parsed.language,
    segments: parsed.segments,
  };
}

/**
 * Transcribes an audio buffer using OpenAI Whisper (`whisper-1`) and returns the full text
 * alongside per-segment confidence signals.
 *
 * Uses `verbose_json` response format with temperature 0 and a domain-specific prompt to
 * reduce hallucination on software-engineering vocabulary.
 *
 * @param audioBuffer - Raw audio data (any Whisper-supported format; typically WebM).
 * @param filename - Filename hint passed to the OpenAI API (used for MIME inference).
 * @returns A `WhisperVerboseResult` with `text`, `language`, and `segments`.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<WhisperVerboseResult> {
  const client = getOpenAIClient();

  const file = await toFile(audioBuffer, filename, { type: 'audio/webm' });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
    response_format: 'verbose_json',
    temperature: 0,
    prompt: WHISPER_DOMAIN_PROMPT,
  });

  return parseVerboseResponse(response);
}

function parseVerboseWithWordsResponse(raw: unknown): WhisperVerboseResult {
  const parsed = whisperVerboseWithWordsSchema.parse(raw);
  return {
    text: parsed.text,
    language: parsed.language,
    segments: parsed.segments,
    words: parsed.words,
  };
}

/**
 * Transcribes a PCM WAV chunk with word-level timestamps for use in overlap deduplication.
 *
 * Requests both `word` and `segment` timestamp granularities so the returned
 * `words` array can be used by {@link concatenateChunkTranscripts} to strip
 * overlapping words at chunk boundaries.
 *
 * @param audioBuffer - Raw WAV audio data for a single recording chunk.
 * @param filename - Filename hint for the OpenAI multipart upload.
 * @returns A `WhisperVerboseResult` with `text`, `language`, `segments`, and `words`.
 */
export async function transcribeWavChunk(
  audioBuffer: Buffer,
  filename: string,
): Promise<WhisperVerboseResult> {
  const client = getOpenAIClient();
  const file = await toFile(audioBuffer, filename, { type: 'audio/wav' });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    temperature: 0,
    prompt: WHISPER_DOMAIN_PROMPT,
  });

  return parseVerboseWithWordsResponse(response);
}

export type { WhisperSegment, WhisperVerboseResult, WhisperWord } from '@/lib/ai/whisper.types';
