// Tests for divergence span detection between normalized and verbatim transcripts.
import { describe, it, expect } from 'vitest';
import { detectDivergence } from './detectDivergence';
import type { VerbatimWord } from '@/lib/assemblyai/transcribe';

const word = (text: string, confidence = 0.9): VerbatimWord => ({ text, start: 0, end: 1, confidence });

describe('detectDivergence', () => {
  it('returns no spans when transcripts match', () => {
    const words = ['i', 'went', 'home'].map((t) => word(t));
    expect(detectDivergence('i went home', words)).toEqual([]);
  });

  it('groups consecutive non-match ops into a single span', () => {
    // verbatim inserts two fillers between matches
    const words = ['i', 'um', 'uh', 'went'].map((t) => word(t));
    const spans = detectDivergence('i went', words);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.type).toBe('insertion');
    expect(spans[0]?.verbatimText).toBe('um uh');
  });

  it('computes confidence as the mean over covered verbatim words', () => {
    const words = ['i', 'um', 'uh', 'went'].map((t, idx) => word(t, idx === 1 ? 0.6 : idx === 2 ? 0.8 : 0.99));
    const spans = detectDivergence('i went', words);
    expect(spans[0]?.confidence).toBeCloseTo(0.7, 5); // mean of 0.6 and 0.8
  });

  it('defaults confidence to 1 for deletion-only spans (no verbatim words)', () => {
    // normalized has an extra word Whisper added; verbatim does not
    const words = ['i', 'went'].map((t) => word(t, 0.5));
    const spans = detectDivergence('i really went', words);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.type).toBe('deletion');
    expect(spans[0]?.confidence).toBe(1);
    expect(spans[0]?.normalizedText).toBe('really');
  });

  it('classifies a same-position word swap as substitution', () => {
    const words = ['i', 'goed'].map((t) => word(t));
    const spans = detectDivergence('i went', words);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.type).toBe('substitution');
    expect(spans[0]?.verbatimText).toBe('goed');
    expect(spans[0]?.normalizedText).toBe('went');
  });
});
