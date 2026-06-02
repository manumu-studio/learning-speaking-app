// Unit tests for functional-load ranking and structural-pattern detection.

import { describe, it, expect } from 'vitest';
import { rankByFunctionalLoad, splitByPriority } from './rankByFunctionalLoad';

// Helper: build a word record with per-phoneme accuracy scores.
function word(w: string, phonemes: Array<{ phoneme: string; accuracyScore: number }>) {
  return { word: w, phonemes };
}

describe('rankByFunctionalLoad — phoneme errors', () => {
  it('surfaces a high-FL /iː/ error that the weak-filter (<70) would have dropped', () => {
    // averageScore 78 is above the old weak threshold but below the C2 floor (85).
    const words = [word('sheep', [{ phoneme: 'iy', accuracyScore: 78 }])];
    const ranked = rankByFunctionalLoad(words);
    const sheep = ranked.find((r) => r.id === 'ship-sheep');
    expect(sheep).toBeDefined();
    expect(sheep?.averageScore).toBe(78);
  });

  it('ignores phonemes scoring at or above the floor (solid)', () => {
    const words = [word('sheep', [{ phoneme: 'iy', accuracyScore: 92 }])];
    expect(rankByFunctionalLoad(words)).toHaveLength(0);
  });

  it('ranks by functional load: weight × occurrences, high-FL first', () => {
    const words = [
      word('think', [{ phoneme: 'th', accuracyScore: 50 }]), // low FL (weight 1)
      word('sheep', [{ phoneme: 'iy', accuracyScore: 60 }]), // high FL (weight 3)
      word('eat', [{ phoneme: 'iy', accuracyScore: 60 }]),
    ];
    const ranked = rankByFunctionalLoad(words);
    expect(ranked[0]?.id).toBe('ship-sheep'); // 3 × 2 = 6 beats 1 × 1 = 1
    expect(ranked[0]?.occurrences).toBe(2);
    expect(ranked[0]?.flScore).toBe(6);
  });

  it('weights the average score by occurrences', () => {
    const words = [
      word('cat', [{ phoneme: 'ae', accuracyScore: 40 }]),
      word('bad', [{ phoneme: 'ae', accuracyScore: 80 }]),
    ];
    const cat = rankByFunctionalLoad(words).find((r) => r.id === 'cat-vowel');
    expect(cat?.averageScore).toBe(60);
    expect(cat?.occurrences).toBe(2);
  });
});

describe('rankByFunctionalLoad — structural detection', () => {
  it('detects s-cluster epenthesis from a low-scoring word onset', () => {
    const words = [word('school', [
      { phoneme: 's', accuracyScore: 55 },
      { phoneme: 'k', accuracyScore: 90 },
    ])];
    const sCluster = rankByFunctionalLoad(words).find((r) => r.id === 's-cluster');
    expect(sCluster).toBeDefined();
    expect(sCluster?.kind).toBe('structural');
    expect(sCluster?.occurrences).toBe(1);
  });

  it('detects dropped final consonants from a low final-phoneme score', () => {
    const words = [word('asked', [
      { phoneme: 'ae', accuracyScore: 90 },
      { phoneme: 's', accuracyScore: 88 },
      { phoneme: 't', accuracyScore: 45 },
    ])];
    const finalC = rankByFunctionalLoad(words).find((r) => r.id === 'final-consonant');
    expect(finalC).toBeDefined();
    expect(finalC?.occurrences).toBe(1);
  });

  it('does not flag structural patterns when the relevant phoneme is solid', () => {
    const words = [word('school', [
      { phoneme: 's', accuracyScore: 95 },
      { phoneme: 'k', accuracyScore: 95 },
    ])];
    expect(rankByFunctionalLoad(words).find((r) => r.id === 's-cluster')).toBeUndefined();
  });
});

describe('splitByPriority', () => {
  it('separates high/moderate priority sounds from low-FL accent polish', () => {
    const words = [
      word('sheep', [{ phoneme: 'iy', accuracyScore: 60 }]), // high
      word('think', [{ phoneme: 'th', accuracyScore: 60 }]), // low
    ];
    const { priority, polish } = splitByPriority(rankByFunctionalLoad(words));
    expect(priority.map((p) => p.id)).toContain('ship-sheep');
    expect(polish.map((p) => p.id)).toContain('think-this');
  });
});

describe('rankByFunctionalLoad — robustness', () => {
  it('returns empty for no words and tolerates malformed phoneme data', () => {
    expect(rankByFunctionalLoad([])).toHaveLength(0);
    expect(rankByFunctionalLoad([{ word: 'x', phonemes: 'garbage' }])).toHaveLength(0);
  });
});
