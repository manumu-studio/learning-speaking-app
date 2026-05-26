// Unit tests for the L1 Spanish interference tagger — uses synthetic WordResult fixtures
import { describe, it, expect } from 'vitest';
import { tagSpanishL1 } from './l1Spanish';
import type { WordResult } from './azurePronunciation.types';

// ---------------------------------------------------------------------------
// Fixture factory — builds a minimal WordResult with safe defaults
// ---------------------------------------------------------------------------

function makeWord(overrides: {
  word?: string;
  accuracyScore?: number;
  errorType?: WordResult['errorType'];
  offsetMs?: number;
  durationMs?: number;
  phonemes?: WordResult['phonemes'];
  l1Tags?: string[];
  prosodyFeedback?: WordResult['prosodyFeedback'];
}): WordResult {
  // Build base without optional fields, then conditionally add them
  // to satisfy exactOptionalPropertyTypes (no explicit undefined assignment)
  const base: WordResult = {
    word: overrides.word ?? 'test',
    accuracyScore: overrides.accuracyScore ?? 80,
    errorType: overrides.errorType ?? 'None',
    offsetMs: overrides.offsetMs ?? 0,
    durationMs: overrides.durationMs ?? 200,
    phonemes: overrides.phonemes ?? [],
    l1Tags: overrides.l1Tags ?? [],
  };
  if (overrides.prosodyFeedback !== undefined) {
    base.prosodyFeedback = overrides.prosodyFeedback;
  }
  return base;
}

function makePhoneme(
  expected: string,
  topActual: string,
  accuracy: number,
): WordResult['phonemes'][number] {
  return {
    phoneme: expected,
    accuracyScore: accuracy,
    nBest: [{ phoneme: topActual, score: accuracy }],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tagSpanishL1', () => {
  it('tags b_for_v when /v/ expected, nBest[0]=/b/, accuracy=45', () => {
    const word = makeWord({ phonemes: [makePhoneme('v', 'b', 45)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('b_for_v');
  });

  it('does NOT tag b_for_v when accuracy is >= 60 (borderline good pronunciation)', () => {
    const word = makeWord({ phonemes: [makePhoneme('v', 'b', 65)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).not.toContain('b_for_v');
  });

  it('tags th_substitution when /θ/ expected and nBest[0]=/t/', () => {
    const word = makeWord({ phonemes: [makePhoneme('θ', 't', 40)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('th_substitution');
  });

  it('tags th_substitution when /θ/ expected and nBest[0]=/s/', () => {
    const word = makeWord({ phonemes: [makePhoneme('θ', 's', 40)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('th_substitution');
  });

  it('tags z_devoicing when /z/ expected, nBest[0]=/s/, accuracy=50', () => {
    const word = makeWord({ phonemes: [makePhoneme('z', 's', 50)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('z_devoicing');
  });

  it('does NOT tag z_devoicing when accuracy is >= 60', () => {
    const word = makeWord({ phonemes: [makePhoneme('z', 's', 62)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).not.toContain('z_devoicing');
  });

  it('tags no_schwa_reduction when /ə/ expected, nBest[0] differs, accuracy=60', () => {
    const word = makeWord({ phonemes: [makePhoneme('ə', 'a', 60)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('no_schwa_reduction');
  });

  it('does NOT tag no_schwa_reduction when accuracy is >= 70', () => {
    const word = makeWord({ phonemes: [makePhoneme('ə', 'a', 72)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).not.toContain('no_schwa_reduction');
  });

  it('tags vowel_collapse when /æ/ expected and nBest[0]=/a/', () => {
    const word = makeWord({ phonemes: [makePhoneme('æ', 'a', 55)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('vowel_collapse');
  });

  it('tags vowel_collapse when /ʌ/ expected and nBest[0]=/a/', () => {
    const word = makeWord({ phonemes: [makePhoneme('ʌ', 'a', 55)] });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('vowel_collapse');
  });

  it('tags syllable_timed when monotoneSyllablePitchDeltaConfidence=0.2', () => {
    const word = makeWord({
      prosodyFeedback: {
        breakErrorTypes: [],
        breakLengthMs: 0,
        intonationErrorTypes: [],
        monotoneSyllablePitchDeltaConfidence: 0.2,
      },
    });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('syllable_timed');
  });

  it('does NOT tag syllable_timed when monotoneSyllablePitchDeltaConfidence=0.5', () => {
    const word = makeWord({
      prosodyFeedback: {
        breakErrorTypes: [],
        breakLengthMs: 0,
        intonationErrorTypes: [],
        monotoneSyllablePitchDeltaConfidence: 0.5,
      },
    });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).not.toContain('syllable_timed');
  });

  it('returns empty l1Tags for a word with high accuracy scores', () => {
    const word = makeWord({
      accuracyScore: 95,
      phonemes: [
        makePhoneme('k', 'k', 96),
        makePhoneme('æ', 'æ', 94),
        makePhoneme('t', 't', 97),
      ],
      prosodyFeedback: {
        breakErrorTypes: [],
        breakLengthMs: 0,
        intonationErrorTypes: [],
        monotoneSyllablePitchDeltaConfidence: 0.8,
      },
    });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toHaveLength(0);
  });

  it('preserves existing l1Tags when adding new ones', () => {
    const word = makeWord({
      l1Tags: ['th_substitution'],
      phonemes: [makePhoneme('v', 'b', 45)],
    });
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toContain('th_substitution');
    expect(result?.l1Tags).toContain('b_for_v');
  });

  it('does not mutate the input array', () => {
    const word = makeWord({ phonemes: [makePhoneme('v', 'b', 45)] });
    const input = [word];
    tagSpanishL1(input);
    // Original word should not have l1Tags modified
    expect(input[0]?.l1Tags).toHaveLength(0);
  });

  it('handles a word with no phonemes gracefully (no tags, no throw)', () => {
    const word = makeWord({ phonemes: [] });
    expect(() => tagSpanishL1([word])).not.toThrow();
    const [result] = tagSpanishL1([word]);
    expect(result?.l1Tags).toHaveLength(0);
  });

  it('handles an empty words array', () => {
    expect(tagSpanishL1([])).toHaveLength(0);
  });
});
