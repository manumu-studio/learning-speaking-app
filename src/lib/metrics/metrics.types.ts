// Canonical metric key and level types — shared across lib and features

/** One of eleven metric dimensions tracked per session: 8 Claude-scored + 3 Azure-computed (see Prisma `MetricSnapshot.key`). */
export type MetricKey =
  | 'connectorRepetition'
  | 'structuralVariety'
  | 'vocabularyPrecision'
  | 'verbAccuracy'
  | 'argumentClosure'
  | 'fillerUsage'
  | 'lexicalSophistication'
  | 'registerPragmatics'
  | 'pronunciationAccuracy'
  | 'prosodyScore'
  | 'speakingRate';

// Pronunciation metric keys
export const PRONUNCIATION_METRIC_KEYS = [
  'pronunciationAccuracy',
  'prosodyScore',
  'speakingRate',
] as const;

export type PronunciationMetricKey = (typeof PRONUNCIATION_METRIC_KEYS)[number];

export type MetricLevel = 'low' | 'medium' | 'high';
