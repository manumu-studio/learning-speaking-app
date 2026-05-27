// Tests for bridge lookup function — verifies L1 tag resolution to coaching data
import { describe, it, expect } from 'vitest';
import { getBridgeRules } from './bridgeLookup';

describe('getBridgeRules', () => {
  it('returns bridge feedback for a known L1 tag', () => {
    const result = getBridgeRules(['b_for_v']);
    expect(result).toHaveLength(1);
    expect(result[0]?.tag).toBe('b_for_v');
    expect(result[0]?.rule.severity).toBe('high');
    expect(result[0]?.rule.category).toBe('consonant');
    expect(result[0]?.rule.bridgeInstruction).toBeTruthy();
  });

  it('returns multiple bridge feedbacks for multiple tags', () => {
    const result = getBridgeRules(['b_for_v', 'th_substitution', 'syllable_timed']);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.tag)).toEqual(['b_for_v', 'th_substitution', 'syllable_timed']);
  });

  it('filters out unknown tags', () => {
    const result = getBridgeRules(['b_for_v', 'nonexistent_tag', 'th_substitution']);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.tag)).toEqual(['b_for_v', 'th_substitution']);
  });

  it('returns empty array for all unknown tags', () => {
    const result = getBridgeRules(['fake_tag', 'another_fake']);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const result = getBridgeRules([]);
    expect(result).toHaveLength(0);
  });

  it('every bridge rule has required coaching fields', () => {
    const allTags = [
      'b_for_v', 'th_substitution', 'voiced_th_d', 'z_devoicing',
      'no_schwa_reduction', 'vowel_collapse', 'syllable_timed', 'sh_as_ch',
      'i_vs_ee_merge', 'ae_substitution', 'cup_as_cap', 'u_merge',
      'h_velar', 'unaspirated_ptk', 'clear_l_coda', 'rhotic_trilled',
      'cluster_simplification', 's_epenthesis', 'monophthongised_diphthong',
      'wrong_stress', 'question_intonation',
    ];
    const result = getBridgeRules(allTags);
    expect(result).toHaveLength(21);

    for (const { rule } of result) {
      expect(rule.bridgeInstruction.length).toBeGreaterThan(0);
      expect(rule.spanishAnchor.length).toBeGreaterThan(0);
      expect(rule.englishTarget.length).toBeGreaterThan(0);
      expect(rule.minimalPairs.length).toBeGreaterThanOrEqual(1);
      expect(rule.commonWords.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('preserves input order in output', () => {
    const result = getBridgeRules(['syllable_timed', 'b_for_v', 'z_devoicing']);
    expect(result.map((r) => r.tag)).toEqual(['syllable_timed', 'b_for_v', 'z_devoicing']);
  });
});
