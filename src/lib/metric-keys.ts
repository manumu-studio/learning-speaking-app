// Canonical speaking-analysis metric keys — used for API validation and prompts
export const SPEAKING_METRIC_KEYS = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
] as const;

export type SpeakingMetricKey = (typeof SPEAKING_METRIC_KEYS)[number];

export function isSpeakingMetricKey(value: string | null | undefined): value is SpeakingMetricKey {
  return (
    value !== null &&
    value !== undefined &&
    (SPEAKING_METRIC_KEYS as readonly string[]).includes(value)
  );
}
