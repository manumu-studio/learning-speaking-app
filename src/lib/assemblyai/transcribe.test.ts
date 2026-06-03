// Tests for the AssemblyAI verbatim transcription function (SDK mocked).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/assemblyai/client', () => ({ getAssemblyAIClient: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { transcribeVerbatim } from './transcribe';
import { getAssemblyAIClient } from '@/lib/assemblyai/client';

type TranscribeFn = (params: unknown) => Promise<unknown>;

function mockTranscribe(impl: TranscribeFn): TranscribeFn {
  const fn = vi.fn(impl);
  vi.mocked(getAssemblyAIClient).mockReturnValue({ transcripts: { transcribe: fn } } as never);
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transcribeVerbatim', () => {
  it('returns a validated result on success', async () => {
    mockTranscribe(async () => ({
      status: 'completed',
      text: 'so um i went',
      words: [
        { text: 'so', start: 0, end: 100, confidence: 0.9 },
        { text: 'um', start: 100, end: 200, confidence: 0.7 },
        { text: 'i', start: 200, end: 300, confidence: 0.99 },
        { text: 'went', start: 300, end: 400, confidence: 0.95 },
      ],
    }));

    const result = await transcribeVerbatim('https://signed.example/audio');
    expect(result).not.toBeNull();
    expect(result?.text).toBe('so um i went');
    expect(result?.wordCount).toBe(4);
    expect(result?.provider).toBe('assemblyai');
    expect(result?.words[1]).toEqual({ text: 'um', start: 100, end: 200, confidence: 0.7 });
  });

  it('sends the correct request params (speech_models, language, verbatim prompt)', async () => {
    const fn = mockTranscribe(async () => ({ status: 'completed', text: 'hi', words: [] }));
    await transcribeVerbatim('https://signed.example/audio');

    const params = fn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.audio).toBe('https://signed.example/audio');
    expect(params.speech_models).toEqual(['universal-3-pro', 'universal-2']);
    expect(params.language_code).toBe('en');
    expect(String(params.prompt)).toContain('disfluencies');
    expect(params.keyterms_prompt).toBeUndefined();
    expect(params.word_boost).toBeUndefined();
  });

  it('returns null when the transcript status is error', async () => {
    mockTranscribe(async () => ({ status: 'error', error: 'boom', text: null, words: null }));
    expect(await transcribeVerbatim('https://signed.example/audio')).toBeNull();
  });

  it('returns null (never throws) when the SDK throws', async () => {
    mockTranscribe(async () => {
      throw new Error('network down');
    });
    await expect(transcribeVerbatim('https://signed.example/audio')).resolves.toBeNull();
  });

  it('handles a missing words array via schema default', async () => {
    mockTranscribe(async () => ({ status: 'completed', text: 'hello' }));
    const result = await transcribeVerbatim('https://signed.example/audio');
    expect(result?.words).toEqual([]);
    expect(result?.wordCount).toBe(0);
  });
});
