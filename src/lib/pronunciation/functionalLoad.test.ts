// Unit tests for the functional-load knowledge table and helpers.

import { describe, it, expect } from 'vitest';
import {
  FUNCTIONAL_LOAD_TABLE,
  PHONEME_FL_ENTRIES,
  STRUCTURAL_FL_ENTRIES,
  hasDoubleVowelSound,
  lookupByIpa,
} from './functionalLoad';

describe('hasDoubleVowelSound', () => {
  it('flags long vowels (ː marker)', () => {
    expect(hasDoubleVowelSound('/ʃiːp/')).toBe(true);
    expect(hasDoubleVowelSound('/skuːl/')).toBe(true);
  });

  it('flags diphthongs', () => {
    expect(hasDoubleVowelSound('/voʊt/')).toBe(true);
    expect(hasDoubleVowelSound('/ɹaɪt/')).toBe(true);
  });

  it('returns false for short single vowels', () => {
    expect(hasDoubleVowelSound('/ʃɪp/')).toBe(false);
    expect(hasDoubleVowelSound('/kæt/')).toBe(false);
  });
});

describe('FUNCTIONAL_LOAD_TABLE', () => {
  it('derives weight from tier consistently', () => {
    for (const entry of FUNCTIONAL_LOAD_TABLE) {
      const expected = entry.tier === 'high' ? 3 : entry.tier === 'moderate' ? 2 : 1;
      expect(entry.weight).toBe(expected);
    }
  });

  it('gives every entry a rule and at least one example', () => {
    for (const entry of FUNCTIONAL_LOAD_TABLE) {
      expect(entry.rule.length).toBeGreaterThan(0);
      expect(entry.examples.length).toBeGreaterThan(0);
    }
  });

  it('stamps the double-vowel flag onto examples correctly', () => {
    const sheep = FUNCTIONAL_LOAD_TABLE.find((e) => e.id === 'ship-sheep')
      ?.examples.find((x) => x.word === 'sheep');
    expect(sheep?.hasDoubleVowelSound).toBe(true);
    const ship = FUNCTIONAL_LOAD_TABLE.find((e) => e.id === 'ship-sheep')
      ?.examples.find((x) => x.word === 'ship');
    expect(ship?.hasDoubleVowelSound).toBe(false);
  });

  it('uses unique ids', () => {
    const ids = FUNCTIONAL_LOAD_TABLE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps phoneme and structural partitions disjoint and complete', () => {
    expect(PHONEME_FL_ENTRIES.length + STRUCTURAL_FL_ENTRIES.length).toBe(
      FUNCTIONAL_LOAD_TABLE.length,
    );
    expect(PHONEME_FL_ENTRIES.every((e) => e.ipaSymbols.length > 0)).toBe(true);
    expect(STRUCTURAL_FL_ENTRIES.every((e) => e.ipaSymbols.length === 0)).toBe(true);
  });
});

describe('lookupByIpa', () => {
  it('resolves a phoneme symbol to its entry', () => {
    expect(lookupByIpa('iː')?.id).toBe('ship-sheep');
    expect(lookupByIpa('æ')?.id).toBe('cat-vowel');
    expect(lookupByIpa('ə')?.id).toBe('schwa');
  });

  it('returns undefined for untracked symbols', () => {
    expect(lookupByIpa('zzz')).toBeUndefined();
  });
});
