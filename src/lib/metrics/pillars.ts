// Metric pillar constants — shared across lib and features

import type { MetricKey } from './metrics.types';

export type PillarKey = 'delivery' | 'language' | 'pronunciation';

export type PillarConfig = {
  readonly label: string;
  readonly metricKeys: readonly MetricKey[];
  readonly color: string;
  readonly icon: string;
};

export const PILLAR_CONFIG = {
  delivery: {
    label: 'Delivery',
    metricKeys: ['speakingRate', 'fillerUsage'],
    color: 'blue',
    icon: 'Mic',
  },
  language: {
    label: 'Language',
    metricKeys: [
      'connectorRepetition',
      'structuralVariety',
      'vocabularyPrecision',
      'verbAccuracy',
      'lexicalSophistication',
      'registerPragmatics',
      'argumentClosure',
    ],
    color: 'violet',
    icon: 'BookOpen',
  },
  pronunciation: {
    label: 'Pronunciation',
    metricKeys: ['pronunciationAccuracy', 'prosodyScore'],
    color: 'emerald',
    icon: 'Waveform',
  },
} as const satisfies Record<PillarKey, PillarConfig>;

export const PILLAR_KEYS: readonly PillarKey[] = ['delivery', 'language', 'pronunciation'] as const;

// Canonical metric key → human-readable label mapping (single source of truth)
export const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
  pronunciationAccuracy: 'Pronunciation Accuracy',
  prosodyScore: 'Prosody & Rhythm',
  lexicalSophistication: 'Lexical Sophistication',
  registerPragmatics: 'Register & Pragmatics',
  speakingRate: 'Speaking Rate',
};
