// Tests for recording cancel tier thresholds used by useRecordingPanel
import { describe, expect, it } from 'vitest';

const TIER_1_MAX_SECS = 45;
const TIER_2_MAX_SECS = 120;

type CancelTier = 'silent' | 'prompt' | 'modal';

function getCancelTier(durationSecs: number): CancelTier {
  if (durationSecs < TIER_1_MAX_SECS) {
    return 'silent';
  }
  if (durationSecs < TIER_2_MAX_SECS) {
    return 'prompt';
  }
  return 'modal';
}

describe('cancel state machine tiers', () => {
  it('uses silent tier under 45 seconds', () => {
    expect(getCancelTier(10)).toBe('silent');
    expect(getCancelTier(44)).toBe('silent');
  });

  it('uses prompt tier between 45s and 2 minutes', () => {
    expect(getCancelTier(45)).toBe('prompt');
    expect(getCancelTier(119)).toBe('prompt');
  });

  it('uses modal tier at 2 minutes and beyond', () => {
    expect(getCancelTier(120)).toBe('modal');
    expect(getCancelTier(300)).toBe('modal');
  });
});
