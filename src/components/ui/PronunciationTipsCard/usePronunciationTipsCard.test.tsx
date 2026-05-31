// Tests for usePronunciationTipsCard — validates array slicing and fetch payload
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePronunciationTipsCard } from './usePronunciationTipsCard';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';

function makeWord(word: string, accuracyScore: number, l1Tag?: string) {
  return {
    word,
    accuracyScore,
    errorType: accuracyScore < 70 ? 'Mispronunciation' : 'None',
    offsetMs: 0,
    durationMs: 100,
    phonemes: [],
    l1Tags: l1Tag ? [l1Tag] : [],
    breakErrorTypes: [],
    intonationErrorTypes: [],
    monotonePitchDelta: null,
  };
}

function makeReport(words: ReturnType<typeof makeWord>[]): PronunciationReport {
  return {
    pronScore: 75,
    accuracyScore: 70,
    fluencyScore: 80,
    completenessScore: 90,
    prosodyScore: 65,
    speakingRateWpm: 140,
    failureReason: null,
    words,
  };
}

describe('usePronunciationTipsCard', () => {
  let fetchBody: Record<string, unknown>;

  beforeEach(() => {
    fetchBody = {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        fetchBody = JSON.parse(init.body as string) as Record<string, unknown>;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tips: [{ focus: 'Test', instruction: 'Do this' }] }),
        });
      })
    );
  });

  it('sends at most 10 weakWords sorted by worst score', async () => {
    const words = Array.from({ length: 15 }, (_, i) =>
      makeWord(`word${i}`, 60 - i)
    );
    const report = makeReport(words);

    renderHook(() => usePronunciationTipsCard(report));

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const sent = fetchBody['weakWords'] as Array<{ word: string; accuracyScore: number }>;
    expect(sent).toHaveLength(10);
    expect(sent[0]?.accuracyScore).toBeLessThanOrEqual(sent[1]?.accuracyScore ?? Infinity);
    expect(sent[0]?.accuracyScore).toBe(46);
  });

  it('sends at most 10 l1Tags', async () => {
    const words = Array.from({ length: 15 }, (_, i) =>
      makeWord(`word${i}`, 50, `tag-${i}`)
    );
    const report = makeReport(words);

    renderHook(() => usePronunciationTipsCard(report));

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const sent = fetchBody['l1Tags'] as string[];
    expect(sent).toHaveLength(10);
  });

  it('passes through all scores and empty topWeakPhonemes', async () => {
    const report = makeReport([makeWord('hello', 90)]);

    renderHook(() => usePronunciationTipsCard(report));

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    expect(fetchBody['pronScore']).toBe(75);
    expect(fetchBody['prosodyScore']).toBe(65);
    expect(fetchBody['topWeakPhonemes']).toEqual([]);
    expect(fetchBody['weakWords']).toEqual([]);
  });

  it('returns done state with tips on success', async () => {
    const report = makeReport([makeWord('hello', 90)]);

    const { result } = renderHook(() => usePronunciationTipsCard(report));

    await waitFor(() => expect(result.current.status).toBe('done'));

    if (result.current.status === 'done') {
      expect(result.current.tips).toHaveLength(1);
      expect(result.current.tips[0]?.focus).toBe('Test');
    }
  });

  it('returns error state on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    );

    const report = makeReport([makeWord('hello', 90)]);
    const { result } = renderHook(() => usePronunciationTipsCard(report));

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
