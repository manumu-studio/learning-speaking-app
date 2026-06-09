// Integration tests for the verbatim pipeline step — persistence + graceful fallback.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import type { VerbatimResult } from '@/lib/assemblyai/transcribe';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/assemblyai/transcribe', () => ({ transcribeVerbatim: vi.fn() }));
vi.mock('@/lib/storage/r2', () => ({ generatePresignedGetUrl: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/observability', () => ({ logPipelineStage: vi.fn() }));
vi.mock('@/lib/analysis/filterSpeakerUtterances', () => ({ filterSpeakerUtterances: vi.fn() }));
vi.mock('@/lib/analysis/divergence', () => ({ detectDivergence: vi.fn() }));
vi.mock('@/lib/prismaJson', () => ({ toInputJson: vi.fn((v: unknown) => v) }));

import { startVerbatim, finishVerbatim } from './runVerbatim';
import { transcribeVerbatim } from '@/lib/assemblyai/transcribe';
import { generatePresignedGetUrl } from '@/lib/storage/r2';
import { filterSpeakerUtterances } from '@/lib/analysis/filterSpeakerUtterances';
import { detectDivergence } from '@/lib/analysis/divergence';

const result: VerbatimResult = {
  text: 'so um i goed home',
  words: [
    { text: 'so', start: 0, end: 1, confidence: 0.9 },
    { text: 'um', start: 1, end: 2, confidence: 0.6 },
    { text: 'i', start: 2, end: 3, confidence: 0.99 },
    { text: 'goed', start: 3, end: 4, confidence: 0.8 },
    { text: 'home', start: 4, end: 5, confidence: 0.95 },
  ],
  wordCount: 5,
  provider: 'assemblyai',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('startVerbatim', () => {
  it('presigns the audio key and forwards the URL to transcription', async () => {
    vi.mocked(generatePresignedGetUrl).mockResolvedValue('https://signed/audio');
    vi.mocked(transcribeVerbatim).mockResolvedValue(result);

    const out = await startVerbatim('sessions/u1/s1/audio.webm');
    expect(generatePresignedGetUrl).toHaveBeenCalledWith('sessions/u1/s1/audio.webm', 600);
    expect(transcribeVerbatim).toHaveBeenCalledWith('https://signed/audio');
    expect(out).toEqual(result);
  });

  it('resolves to null (never rejects) if presigning fails', async () => {
    vi.mocked(generatePresignedGetUrl).mockRejectedValue(new Error('r2 down'));
    await expect(startVerbatim('k')).resolves.toBeNull();
    expect(transcribeVerbatim).not.toHaveBeenCalled();
  });
});

const filteredResult = {
  text: 'i goed home',
  words: [
    { text: 'i', start: 2, end: 3, confidence: 0.99 },
    { text: 'goed', start: 3, end: 4, confidence: 0.8 },
    { text: 'home', start: 4, end: 5, confidence: 0.95 },
  ],
  wordCount: 3,
  removedWordCount: 2,
  filterMethod: 'heuristic' as const,
};

const mockSpans = [{ start: 0, end: 1, verbatimText: 'goed', normalizedText: 'went', type: 'substitution', confidence: 0.8 }];

function setupFinishVerbatimMocks(): void {
  vi.mocked(filterSpeakerUtterances).mockReturnValue(filteredResult);
  vi.mocked(detectDivergence).mockReturnValue(mockSpans as never);
  vi.mocked(prismaMock.speakingSession.update).mockResolvedValue({} as never);
}

describe('finishVerbatim', () => {
  it('returns filtered data and persists raw transcript on success', async () => {
    setupFinishVerbatimMocks();

    const out = await finishVerbatim('s1', 'so i went home', Promise.resolve(result));

    expect(out).not.toBeNull();
    expect(out?.rawVerbatimTranscript).toBe('so um i goed home');
    expect(out?.rawVerbatimWords).toEqual(result.words);
    expect(out?.filtered.wordCount).toBe(3);

    const arg = vi.mocked(prismaMock.speakingSession.update).mock.calls[0]?.[0];
    expect(arg?.where).toEqual({ id: 's1' });
    expect(arg?.data?.verbatimTranscript).toBe('so um i goed home');
    expect(arg?.data?.verbatimProvider).toBe('assemblyai');
  });

  it('returns null without DB write when verbatim promise resolves to null', async () => {
    const out = await finishVerbatim('s1', 'so i went home', Promise.resolve(null));

    expect(out).toBeNull();
    expect(prismaMock.speakingSession.update).not.toHaveBeenCalled();
  });

  it('returns null (never throws) if the DB write fails', async () => {
    setupFinishVerbatimMocks();
    vi.mocked(prismaMock.speakingSession.update).mockRejectedValue(new Error('db down'));
    const out = await finishVerbatim('s1', 'text', Promise.resolve(result));
    expect(out).toBeNull();
  });

  it('calls detectDivergence with filtered words, not raw words', async () => {
    setupFinishVerbatimMocks();

    await finishVerbatim('s1', 'so i went home', Promise.resolve(result));

    expect(filterSpeakerUtterances).toHaveBeenCalledWith(result.text, result.words);
    expect(detectDivergence).toHaveBeenCalledWith('so i went home', filteredResult.words);
  });
});
