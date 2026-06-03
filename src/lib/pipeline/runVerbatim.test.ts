// Integration tests for the verbatim pipeline step — persistence + graceful fallback.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '@/__mocks__/prisma';
import type { VerbatimResult } from '@/lib/assemblyai/transcribe';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/assemblyai/transcribe', () => ({ transcribeVerbatim: vi.fn() }));
vi.mock('@/lib/storage/r2', () => ({ generatePresignedGetUrl: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/observability', () => ({ logPipelineStage: vi.fn() }));

import { startVerbatim, finishVerbatim } from './runVerbatim';
import { transcribeVerbatim } from '@/lib/assemblyai/transcribe';
import { generatePresignedGetUrl } from '@/lib/storage/r2';

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

describe('finishVerbatim', () => {
  it('persists all four fields and divergence spans on success', async () => {
    vi.mocked(prismaMock.speakingSession.update).mockResolvedValue({} as never);

    await finishVerbatim('s1', 'so i went home', Promise.resolve(result));

    const arg = vi.mocked(prismaMock.speakingSession.update).mock.calls[0]?.[0];
    expect(arg?.where).toEqual({ id: 's1' });
    expect(arg?.data?.verbatimTranscript).toBe('so um i goed home');
    expect(arg?.data?.verbatimWordCount).toBe(5);
    expect(arg?.data?.verbatimProvider).toBe('assemblyai');
    expect(arg?.data?.divergenceSpans).not.toBe(Prisma.JsonNull); // real spans written
  });

  it('writes null fields and JsonNull when verbatim failed (pipeline continues)', async () => {
    vi.mocked(prismaMock.speakingSession.update).mockResolvedValue({} as never);

    await finishVerbatim('s1', 'so i went home', Promise.resolve(null));

    const arg = vi.mocked(prismaMock.speakingSession.update).mock.calls[0]?.[0];
    expect(arg?.data?.verbatimTranscript).toBeNull();
    expect(arg?.data?.verbatimWordCount).toBeNull();
    expect(arg?.data?.verbatimProvider).toBeNull();
    expect(arg?.data?.divergenceSpans).toBe(Prisma.JsonNull);
  });

  it('never throws if the DB write fails (best-effort)', async () => {
    vi.mocked(prismaMock.speakingSession.update).mockRejectedValue(new Error('db down'));
    await expect(finishVerbatim('s1', 'text', Promise.resolve(result))).resolves.toBeUndefined();
  });
});
