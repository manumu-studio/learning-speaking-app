// Tests for the countVerbatimFillers pure function — filler detection, density, scoring, and note formatting.

import { describe, it, expect } from 'vitest';
import { countVerbatimFillers } from './countVerbatimFillers';

describe('countVerbatimFillers', () => {
  // ---------------------------------------------------------------------------
  // 1. Empty text
  // ---------------------------------------------------------------------------

  it('returns defaults for empty string', () => {
    const result = countVerbatimFillers('');
    expect(result).toEqual({
      fillerCount: 0,
      totalWords: 0,
      fillerDensityPercent: 0,
      score: 10,
      level: 'excellent',
      note: 'No speech to analyze',
      topFillers: [],
    });
  });

  it('returns defaults for whitespace-only string', () => {
    const result = countVerbatimFillers('   ');
    expect(result.fillerCount).toBe(0);
    expect(result.totalWords).toBe(0);
    expect(result.note).toBe('No speech to analyze');
  });

  // ---------------------------------------------------------------------------
  // 2. No fillers
  // ---------------------------------------------------------------------------

  it('returns 0 fillers and score 10 for clean speech', () => {
    const result = countVerbatimFillers('The presentation went well');
    expect(result.fillerCount).toBe(0);
    expect(result.score).toBe(10);
    expect(result.level).toBe('excellent');
    expect(result.topFillers).toHaveLength(0);
    expect(result.note).toBe('No fillers detected in verbatim transcript');
  });

  // ---------------------------------------------------------------------------
  // 3. Basic single-word fillers
  // ---------------------------------------------------------------------------

  it('counts single-word fillers: um, uh, eh', () => {
    const result = countVerbatimFillers('um I think uh it was eh good');
    expect(result.fillerCount).toBe(3);
    expect(result.totalWords).toBe(8);
  });

  it('counts all single-word filler types: er, ah, hm, hmm, erm', () => {
    const result = countVerbatimFillers('er ah hm hmm erm');
    expect(result.fillerCount).toBe(5);
    expect(result.totalWords).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // 4. Case insensitivity
  // ---------------------------------------------------------------------------

  it('is case-insensitive: Um and um both count', () => {
    const resultMixed = countVerbatimFillers('Um I went um');
    const resultLower = countVerbatimFillers('um I went um');
    expect(resultMixed.fillerCount).toBe(2);
    expect(resultLower.fillerCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 5. Trailing punctuation stripped
  // ---------------------------------------------------------------------------

  it('strips trailing punctuation from single-word fillers', () => {
    const result = countVerbatimFillers('um, I think uh. it was');
    expect(result.fillerCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-word fillers
  // ---------------------------------------------------------------------------

  it('counts multi-word fillers: "you know", "i mean", "sort of"', () => {
    const result = countVerbatimFillers('you know I mean it was sort of good');
    // "you know" = 1, "i mean" = 1, "sort of" = 1 → 3 filler tokens using 6 words
    expect(result.fillerCount).toBe(3);
  });

  it('counts "kind of" as a multi-word filler', () => {
    const result = countVerbatimFillers('it was kind of nice');
    expect(result.fillerCount).toBe(1);
    expect(result.topFillers[0]).toEqual({ word: 'kind of', count: 1 });
  });

  // ---------------------------------------------------------------------------
  // 7. "like" disambiguation
  // ---------------------------------------------------------------------------

  it('"I like pizza" — like is NOT a filler', () => {
    const result = countVerbatimFillers('I like pizza');
    expect(result.fillerCount).toBe(0);
  });

  it('"like" after a comma-ending token IS a filler', () => {
    // Tokenizes as ['it', 'was,', 'like', 'really', 'good'] — prev word ends with ','
    const result = countVerbatimFillers('it was, like really good');
    expect(result.fillerCount).toBe(1);
    const likeEntry = result.topFillers.find((f) => f.word === 'like');
    expect(likeEntry).toBeDefined();
    expect(likeEntry?.count).toBe(1);
  });

  it('"like that" at position 0 — like IS a filler', () => {
    const result = countVerbatimFillers('like that was great');
    expect(result.fillerCount).toBe(1);
  });

  it('"uh like it happened" — like after filler IS a filler', () => {
    const result = countVerbatimFillers('uh like it happened');
    // uh = 1, like (after filler) = 1 → 2 total
    expect(result.fillerCount).toBe(2);
  });

  it('mixed like: one filler-like (after comma token), one non-filler', () => {
    // 'I like pizza' — like not at pos 0 and prev 'I' has no comma → NOT filler
    // 'but, like it' — prev token is 'but,' ending with ',' → IS filler
    const result = countVerbatimFillers('I like pizza but, like it was fine');
    expect(result.fillerCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 8. Density calculation and score mapping
  // ---------------------------------------------------------------------------

  it('5 fillers in 100 words → 5% density → score 6', () => {
    // Build 100 words: 5 fillers + 95 non-filler words
    const nonFillerWords = Array.from({ length: 95 }, () => 'word').join(' ');
    const text = `um um um um um ${nonFillerWords}`;
    const result = countVerbatimFillers(text);
    expect(result.fillerCount).toBe(5);
    expect(result.totalWords).toBe(100);
    expect(result.fillerDensityPercent).toBeCloseTo(5, 5);
    expect(result.score).toBe(6);
    expect(result.level).toBe('developing');
  });

  it('score boundary: 0 fillers → density 0% → score 10', () => {
    const result = countVerbatimFillers('this is clean speech with no fillers at all');
    expect(result.score).toBe(10);
  });

  it('score boundary: exactly 1% density → score 10', () => {
    // 1 filler in 100 words = 1% ≤ 1 threshold → score 10
    const nonFillerWords = Array.from({ length: 99 }, () => 'word').join(' ');
    const result = countVerbatimFillers(`um ${nonFillerWords}`);
    expect(result.fillerCount).toBe(1);
    expect(result.totalWords).toBe(100);
    expect(result.score).toBe(10);
  });

  it('score boundary: 1.5% density → score 9 (excellent)', () => {
    // 3 fillers in 200 words = 1.5% → ≤2 threshold → score 9
    const nonFillerWords = Array.from({ length: 197 }, () => 'word').join(' ');
    const result = countVerbatimFillers(`um um um ${nonFillerWords}`);
    expect(result.fillerCount).toBe(3);
    expect(result.totalWords).toBe(200);
    expect(result.score).toBe(9);
    expect(result.level).toBe('excellent');
  });

  it('score boundary: exactly 15% density → score 2 (critical)', () => {
    // 15 fillers in 100 words = 15% ≤ 15 threshold → score 2
    // score 2 < 3 → level 'critical' (scoreToLevel: score≥3 → needs_work, else critical)
    const fillerWords = Array.from({ length: 15 }, () => 'um').join(' ');
    const nonFillerWords = Array.from({ length: 85 }, () => 'word').join(' ');
    const result = countVerbatimFillers(`${fillerWords} ${nonFillerWords}`);
    expect(result.fillerCount).toBe(15);
    expect(result.totalWords).toBe(100);
    expect(result.score).toBe(2);
    expect(result.level).toBe('critical');
  });

  it('score boundary: >15% density → score 1 (critical)', () => {
    // 16 fillers in 100 words = 16% > 15 threshold → score 1
    const fillerWords = Array.from({ length: 16 }, () => 'um').join(' ');
    const nonFillerWords = Array.from({ length: 84 }, () => 'word').join(' ');
    const result = countVerbatimFillers(`${fillerWords} ${nonFillerWords}`);
    expect(result.fillerCount).toBe(16);
    expect(result.totalWords).toBe(100);
    expect(result.score).toBe(1);
    expect(result.level).toBe('critical');
  });

  // ---------------------------------------------------------------------------
  // 9. Level labels
  // ---------------------------------------------------------------------------

  it('score ≥9 → level excellent', () => {
    const result = countVerbatimFillers('great talk with no fillers whatsoever');
    expect(result.level).toBe('excellent');
  });

  it('score 5-6 → level developing', () => {
    // ~5% density → score 6
    const nonFillerWords = Array.from({ length: 95 }, () => 'word').join(' ');
    const result = countVerbatimFillers(`um um um um um ${nonFillerWords}`);
    expect(result.level).toBe('developing');
  });

  it('score 3-4 → level needs_work', () => {
    // ~10 fillers in 100 words = 10% ≤ 10 → score 3
    const fillerWords = Array.from({ length: 10 }, () => 'um').join(' ');
    const nonFillerWords = Array.from({ length: 90 }, () => 'word').join(' ');
    const result = countVerbatimFillers(`${fillerWords} ${nonFillerWords}`);
    expect(result.level).toBe('needs_work');
  });

  // ---------------------------------------------------------------------------
  // 10. topFillers ordering
  // ---------------------------------------------------------------------------

  it('topFillers sorted descending by count', () => {
    // um x3, uh x2, ah x1 → expected order: um, uh, ah
    const result = countVerbatimFillers('um uh ah um uh um good talk');
    expect(result.topFillers[0]).toEqual({ word: 'um', count: 3 });
    expect(result.topFillers[1]).toEqual({ word: 'uh', count: 2 });
    expect(result.topFillers[2]).toEqual({ word: 'ah', count: 1 });
  });

  // ---------------------------------------------------------------------------
  // 11. Note format
  // ---------------------------------------------------------------------------

  it('note format matches expected template with density, counts, and top fillers', () => {
    const result = countVerbatimFillers('um uh um good talk about things');
    // 2 fillers (um x2, uh x1 = 3), 7 words → 3/7*100 ≈ 42.9%
    expect(result.note).toMatch(/^\d+\.\d+% filler density \(\d+ fillers \/ \d+ words\)\. Top:/);
  });

  it('note includes top filler name and count', () => {
    const result = countVerbatimFillers('um um uh good');
    expect(result.note).toContain('um (2)');
    expect(result.note).toContain('uh (1)');
  });

  it('note shows "No fillers detected in verbatim transcript" when count is 0', () => {
    const result = countVerbatimFillers('a perfectly fluent sentence here');
    expect(result.note).toBe('No fillers detected in verbatim transcript');
  });
});

// ---------------------------------------------------------------------------
// 12. Snapshot - full density-to-score mapping table (regression lock)
// ---------------------------------------------------------------------------

describe('densityToScore snapshot - regression lock', () => {
  // Helper: build a text with exactly `fillerCount` fillers in `totalWords` total words.
  function buildText(fillerCount: number, totalWords: number): string {
    const fillers = Array.from({ length: fillerCount }, () => 'um').join(' ');
    const padding = Array.from(
      { length: totalWords - fillerCount },
      () => 'word',
    ).join(' ');
    return fillerCount === 0 ? padding : `${fillers} ${padding}`;
  }

  it.each([
    // fillerCount, totalWords, expectedScore, expectedLevel
    // Exactly at threshold boundaries (DENSITY_THRESHOLDS = [1,2,3,4,5,6,8,10,15])
    [1, 100, 10, 'excellent'],   // 1.0% <= 1  -> score 10
    [2, 100, 9, 'excellent'],    // 2.0% <= 2  -> score 9
    [3, 100, 8, 'good'],         // 3.0% <= 3  -> score 8
    [4, 100, 7, 'good'],         // 4.0% <= 4  -> score 7
    [5, 100, 6, 'developing'],   // 5.0% <= 5  -> score 6
    [6, 100, 5, 'developing'],   // 6.0% <= 6  -> score 5
    [8, 100, 4, 'needs_work'],   // 8.0% <= 8  -> score 4
    [10, 100, 3, 'needs_work'],  // 10.0% <= 10 -> score 3
    [15, 100, 2, 'critical'],    // 15.0% <= 15 -> score 2
    [16, 100, 1, 'critical'],    // 16.0% > 15  -> score 1
  ] as const)(
    '%i fillers / %i words -> score %i (%s)',
    (fillerCount, totalWords, expectedScore, expectedLevel) => {
      const text = buildText(fillerCount, totalWords);
      const result = countVerbatimFillers(text);
      expect(result.score).toBe(expectedScore);
      expect(result.level).toBe(expectedLevel);
    },
  );

  it('empty string always yields score 10 regardless of threshold table', () => {
    expect(countVerbatimFillers('').score).toBe(10);
  });

  it('density exactly at a threshold is inclusive (<=) not exclusive', () => {
    // 1 filler in 100 words = exactly 1.00% - must score 10, not 9
    const result = countVerbatimFillers(buildText(1, 100));
    expect(result.score).toBe(10);

    // 2 fillers in 100 words = exactly 2.00% - must score 9, not 8
    const result2 = countVerbatimFillers(buildText(2, 100));
    expect(result2.score).toBe(9);
  });

  it('score just above each boundary drops by exactly 1', () => {
    // 2 fillers in 100 words = 2.0% (threshold 2) -> score 9
    // 3 fillers in 100 words = 3.0% (threshold 3) -> score 8 - one point lower
    const at2 = countVerbatimFillers(buildText(2, 100));
    const at3 = countVerbatimFillers(buildText(3, 100));
    expect(at2.score - at3.score).toBe(1);
  });
});
