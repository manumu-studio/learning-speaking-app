// Tests for speaking metric key guards and canonical list
import { describe, expect, it } from 'vitest';
import { SPEAKING_METRIC_KEYS, isSpeakingMetricKey } from './metric-keys';

describe('metric-keys', () => {
  it('lists six canonical keys', () => {
    expect(SPEAKING_METRIC_KEYS).toHaveLength(9);
    expect(SPEAKING_METRIC_KEYS).toContain('verbAccuracy');
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
