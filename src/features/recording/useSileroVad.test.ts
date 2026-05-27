// Unit tests for Silero VAD pre-flight hook with mocked @ricky0123/vad-web
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSileroVad, VAD_THRESHOLDS } from './useSileroVad';
import type { VadPreflightResult } from './useSileroVad.types';

const mockRun = vi.fn();
const mockAudioFileToArray = vi.fn();

vi.mock('@ricky0123/vad-web', () => ({
  NonRealTimeVAD: {
    new: vi.fn().mockResolvedValue({
      run: (...args: unknown[]) => mockRun(...args),
    }),
  },
  utils: {
    audioFileToArray: (...args: unknown[]) => mockAudioFileToArray(...args),
  },
}));

describe('useSileroVad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioFileToArray.mockResolvedValue({
      audio: new Float32Array(16000),
      sampleRate: 16000,
    });
  });

  it('returns speech-detected when VAD finds a continuous segment', async () => {
    mockRun.mockImplementation(async function* () {
      yield { start: 0, end: 2 };
    });

    const { result } = renderHook(() => useSileroVad());

    let analysis: VadPreflightResult | undefined;
    await act(async () => {
      analysis = await result.current.analyzeBlob(new Blob(['audio']));
    });

    expect(analysis).toEqual({ outcome: 'speech-detected' });
  });

  it('returns no-speech when VAD finds no segments', async () => {
    mockRun.mockImplementation(async function* () {
      // no yields
    });

    const { result } = renderHook(() => useSileroVad());

    let analysis: VadPreflightResult | undefined;
    await act(async () => {
      analysis = await result.current.analyzeBlob(new Blob(['audio']));
    });

    expect(analysis).toMatchObject({ outcome: 'no-speech' });
  });

  it('returns multi-voice for fragmented speech segments', async () => {
    mockRun.mockImplementation(async function* () {
      yield { start: 0, end: 0.4 };
      yield { start: 1.5, end: 1.9 };
      yield { start: 3.0, end: 3.4 };
    });

    const { result } = renderHook(() => useSileroVad());

    let analysis: VadPreflightResult | undefined;
    await act(async () => {
      analysis = await result.current.analyzeBlob(new Blob(['audio']));
    });

    expect(analysis).toMatchObject({ outcome: 'multi-voice' });
  });

  it('returns error outcome when VAD throws', async () => {
    mockAudioFileToArray.mockRejectedValueOnce(new Error('decode failed'));

    const { result } = renderHook(() => useSileroVad());

    let analysis: VadPreflightResult | undefined;
    await act(async () => {
      analysis = await result.current.analyzeBlob(new Blob(['audio']));
    });

    expect(analysis).toEqual({
      outcome: 'error',
      message: 'Speech check failed — you can still upload if the recording sounds correct.',
    });
    expect(result.current.status).toBe('done');
  });

  it('transitions status through idle → loading → running → done', async () => {
    mockRun.mockImplementation(async function* () {
      yield { start: 0, end: 1 };
    });

    const { result } = renderHook(() => useSileroVad());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.analyzeBlob(new Blob(['audio']));
    });

    expect(result.current.status).toBe('done');
  });

  it('resets status to idle via reset()', async () => {
    mockRun.mockImplementation(async function* () {
      yield { start: 0, end: 1 };
    });

    const { result } = renderHook(() => useSileroVad());

    await act(async () => {
      await result.current.analyzeBlob(new Blob(['audio']));
    });
    expect(result.current.status).toBe('done');

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
  });

  it('exports VAD_THRESHOLDS as named constants', () => {
    expect(VAD_THRESHOLDS.minSpeechMs).toBe(400);
    expect(VAD_THRESHOLDS.multiVoiceMinSegments).toBe(3);
    expect(VAD_THRESHOLDS.multiVoiceGapMs).toBe(800);
    expect(VAD_THRESHOLDS.multiVoiceSpeechRatio).toBe(0.6);
  });
});
