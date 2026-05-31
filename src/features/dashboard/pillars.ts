// Pillar config and score computation — groups 9 metrics into Delivery, Language, Pronunciation

import type { DashboardMetric, MetricKey } from './dashboard.types';

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
    metricKeys: ['speakingRate', 'fillerUsage', 'argumentClosure'],
    color: 'blue',
    icon: 'Mic',
  },
  language: {
    label: 'Language',
    metricKeys: ['connectorRepetition', 'structuralVariety', 'vocabularyPrecision', 'verbAccuracy'],
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
  speakingRate: 'Speaking Rate',
};

export type PillarScore = {
  pillarKey: PillarKey;
  label: string;
  averageScore: number;
  delta: number;
  sparklineData: number[];
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function metricDelta(metric: DashboardMetric): number {
  const history = metric.history;
  if (history.length === 0) return 0;
  const lastSeven = history.slice(-7);
  const historyMean = mean(lastSeven);
  return metric.currentScore - historyMean;
}

function sparklineFromMetrics(metrics: DashboardMetric[]): number[] {
  const histories = metrics.map((m) => m.history).filter((h) => h.length > 0);
  if (histories.length === 0) return [];

  const minLength = Math.min(...histories.map((h) => h.length));
  const result: number[] = [];

  for (let i = 0; i < minLength; i += 1) {
    const valuesAtIndex = histories.map((h) => h[i]).filter((v): v is number => v !== undefined);
    result.push(mean(valuesAtIndex));
  }

  return result;
}

export function computePillarScores(metrics: DashboardMetric[]): PillarScore[] {
  return PILLAR_KEYS.map((pillarKey) => {
    const config = PILLAR_CONFIG[pillarKey];
    const constituents = metrics.filter((m) =>
      (config.metricKeys as readonly string[]).includes(m.key),
    );

    const scores = constituents.map((m) => m.currentScore);
    const averageScore = scores.length > 0 ? mean(scores) : 0;

    const deltas = constituents.map(metricDelta);
    const delta = deltas.length > 0 ? mean(deltas) : 0;

    const sparklineData = sparklineFromMetrics(constituents);

    return {
      pillarKey,
      label: config.label,
      averageScore,
      delta,
      sparklineData,
    };
  });
}
