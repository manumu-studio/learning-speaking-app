// Tests for confidence gate and naturalness flag merging
import { describe, it, expect } from 'vitest';
import { mergeNaturalnessFlags } from './confidenceGate';
import type { ClaudeNaturalnessItem } from './confidenceGate';
import type { NaturalnessFlagInput } from './naturalness.types';

const makeCalqueFlag = (original: string, suggested: string): NaturalnessFlagInput => ({
  originalPhrase: original,
  suggestedPhrase: suggested,
  flagType: 'calqued_collocation',
  dimension: 'collocation',
  confidence: 'high',
  collocationMetric: null,
  metricValue: null,
  l1TransferSource: 'hacer una fiesta',
  rationale: 'test rationale',
  shownToUser: true,
});

const makeClaudeItem = (original: string, suggested: string, dimension = 'collocation'): ClaudeNaturalnessItem => ({
  original,
  suggested,
  rationale: 'Claude detected this',
  dimension,
});

describe('mergeNaturalnessFlags', () => {
  it('returns only calque flags when no Claude items exist', () => {
    const calques = [makeCalqueFlag('make a party', 'throw a party, have a party')];
    const result = mergeNaturalnessFlags(calques, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe('high');
  });

  it('appends Claude items as low confidence', () => {
    const claudeItems = [makeClaudeItem('get a big success', 'achieve great success')];
    const result = mergeNaturalnessFlags([], claudeItems);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe('low');
    expect(result[0]?.flagType).toBe('weak_collocation');
  });

  it('deduplicates Claude items that overlap with calque flags', () => {
    const calques = [makeCalqueFlag('...decided to make a party at...', 'throw a party, have a party')];
    const claudeItems = [makeClaudeItem('make a party', 'throw a party')];
    const result = mergeNaturalnessFlags(calques, claudeItems);
    expect(result).toHaveLength(1);
  });

  it('keeps non-overlapping Claude items alongside calque flags', () => {
    const calques = [makeCalqueFlag('make a party', 'throw a party, have a party')];
    const claudeItems = [makeClaudeItem('do exercises', 'work out', 'collocation')];
    const result = mergeNaturalnessFlags(calques, claudeItems);
    expect(result).toHaveLength(2);
  });

  it('maps unknown dimensions to collocation', () => {
    const claudeItems = [makeClaudeItem('test phrase', 'better phrase', 'unknown_dimension')];
    const result = mergeNaturalnessFlags([], claudeItems);
    expect(result[0]?.dimension).toBe('collocation');
  });

  it('maps discourse_marker dimension to style_note flag type', () => {
    const claudeItems = [makeClaudeItem('so basically', 'in essence', 'discourse_marker')];
    const result = mergeNaturalnessFlags([], claudeItems);
    expect(result[0]?.flagType).toBe('style_note');
    expect(result[0]?.dimension).toBe('discourse_marker');
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeNaturalnessFlags([], [])).toEqual([]);
  });
});
