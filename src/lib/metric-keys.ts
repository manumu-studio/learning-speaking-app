// Canonical speaking-analysis metric keys — used for API validation and prompts
export const SPEAKING_METRIC_KEYS = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
  'lexicalSophistication',
  'registerPragmatics',
  'pronunciationAccuracy',
  'prosodyScore',
  'speakingRate',
] as const;

export type SpeakingMetricKey = (typeof SPEAKING_METRIC_KEYS)[number];

/**
 * Type guard — returns `true` if `value` is one of the 11 canonical `SpeakingMetricKey` strings.
 *
 * @param value - Any string (or null / undefined) to test.
 * @returns `true` when `value` is a `SpeakingMetricKey`; narrows the type accordingly.
 * @example
 * isSpeakingMetricKey('verbAccuracy')  // true
 * isSpeakingMetricKey('unknown')       // false
 * isSpeakingMetricKey(null)            // false
 */
export function isSpeakingMetricKey(value: string | null | undefined): value is SpeakingMetricKey {
  return (
    value !== null &&
    value !== undefined &&
    (SPEAKING_METRIC_KEYS as readonly string[]).includes(value)
  );
}
