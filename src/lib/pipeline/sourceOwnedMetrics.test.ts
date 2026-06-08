// Tests for sourceOwnedMetrics — verifies the SOURCE_OWNED_METRICS list and isSourceOwned type guard
import { describe, expect, it } from 'vitest';

import { SOURCE_OWNED_METRICS, isSourceOwned } from './sourceOwnedMetrics';

describe('isSourceOwned', () => {
  it('returns true for speakingRate', () => {
    expect(isSourceOwned('speakingRate')).toBe(true);
  });

  it('returns true for fillerUsage', () => {
    expect(isSourceOwned('fillerUsage')).toBe(true);
  });

  it('returns false for connectorRepetition', () => {
    expect(isSourceOwned('connectorRepetition')).toBe(false);
  });

  it('returns false for structuralVariety', () => {
    expect(isSourceOwned('structuralVariety')).toBe(false);
  });
});

describe('SOURCE_OWNED_METRICS', () => {
  it('contains exactly 2 entries', () => {
    expect(SOURCE_OWNED_METRICS).toHaveLength(2);
  });
});
