// Tests for speaking metric key guards and canonical list
import { describe, expect, it } from 'vitest';
import { SPEAKING_METRIC_KEYS, isSpeakingMetricKey } from './metric-keys';

describe('metric-keys', () => {
  it('lists eleven canonical keys', () => {
    expect(SPEAKING_METRIC_KEYS).toHaveLength(11);
    expect(SPEAKING_METRIC_KEYS).toContain('verbAccuracy');
    expect(SPEAKING_METRIC_KEYS).toContain('lexicalSophistication');
    expect(SPEAKING_METRIC_KEYS).toContain('registerPragmatics');
  });

  it('isSpeakingMetricKey returns true for known keys', () => {
    expect(isSpeakingMetricKey('fillerUsage')).toBe(true);
  });

  it('isSpeakingMetricKey returns false for unknown or empty values', () => {
    expect(isSpeakingMetricKey('unknown')).toBe(false);
    expect(isSpeakingMetricKey(null)).toBe(false);
    expect(isSpeakingMetricKey(undefined)).toBe(false);
  });
});
