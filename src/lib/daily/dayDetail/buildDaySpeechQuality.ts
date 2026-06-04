// Builds the Speech Quality hierarchy for a day-detail meta-session
import { grammarFlagSchema } from '@/lib/analysis/grammar/grammarFlagSchema';
import type {
  DayFeedbackItem,
  DayMetricSummary,
  DaySpeechQualityCategory,
  DaySpeechQualityData,
  SourceAvailability,
} from './buildDayDetailData.types';

const METRIC_LABELS: Record<string, string> = {
  verbAccuracy: 'Verb Accuracy',
  vocabularyPrecision: 'Vocabulary Precision',
  lexicalSophistication: 'Lexical Sophistication',
  structuralVariety: 'Structural Variety',
  argumentClosure: 'Argument Closure',
  connectorRepetition: 'Connector Repetition',
  registerPragmatics: 'Register & Pragmatics',
};

const CATEGORY_METRICS = {
  grammar: ['verbAccuracy'],
  vocabulary: ['vocabularyPrecision', 'lexicalSophistication'],
  structure: ['structuralVariety', 'argumentClosure', 'connectorRepetition'],
  register: ['registerPragmatics'],
} as const;

export interface SpeechMetricInput {
  readonly key: string;
  readonly score: number;
  readonly note: string | null;
}

export interface SpeechInsightInput {
  readonly category: string;
  readonly pattern: string;
  readonly detail: string;
  readonly suggestion: string | null;
}

export interface SpeechNaturalnessInput {
  readonly originalPhrase: string;
  readonly suggestedPhrase: string;
  readonly flagType: string;
  readonly confidence: string;
  readonly collocationMetric: string | null;
  readonly metricValue: number | null;
  readonly rationale: string;
}

export interface SpeechSessionInput {
  readonly metrics: readonly SpeechMetricInput[];
  readonly insights: readonly SpeechInsightInput[];
  readonly registerFeedback: unknown;
  readonly grammarFlags: unknown;
}

export interface SpeechWordBankInput {
  readonly text: string;
  readonly category: string;
  readonly masteryState: string;
  readonly usageCount: number;
  readonly isActiveTarget: boolean;
}

export interface BuildDaySpeechQualityInput {
  readonly sessions: readonly SpeechSessionInput[];
  readonly naturalnessFlags: readonly SpeechNaturalnessInput[];
  readonly wordBankItems: readonly SpeechWordBankInput[];
  readonly sourceAvailability: SourceAvailability;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function collectMetrics(
  sessions: readonly SpeechSessionInput[],
  keys: readonly string[],
): DayMetricSummary[] {
  return keys.map((key) => {
    const rows = sessions.flatMap((session) =>
      session.metrics.filter((metric) => metric.key === key),
    );
    const avg = average(rows.map((row) => row.score));
    return {
      key,
      label: METRIC_LABELS[key] ?? key,
      score: avg,
      note: rows.find((row) => row.note !== null)?.note ?? null,
    };
  });
}

function scoreFromMetrics(metrics: readonly DayMetricSummary[]): number | null {
  return average(metrics.flatMap((metric) => (metric.score === null ? [] : [metric.score])));
}

function insightItems(
  sessions: readonly SpeechSessionInput[],
  category: string,
): DayFeedbackItem[] {
  return sessions
    .flatMap((session) => session.insights)
    .filter((insight) => insight.category.toLowerCase() === category)
    .slice(0, 4)
    .map((insight) => ({
      title: insight.pattern,
      detail: insight.detail,
      tone: 'neutral',
      evidence: insight.suggestion,
    }));
}

function parseGrammarItems(sessions: readonly SpeechSessionInput[]): DayFeedbackItem[] {
  return sessions.flatMap((session) => {
    const parsed = grammarFlagSchema.array().safeParse(session.grammarFlags);
    if (!parsed.success) return [];
    return parsed.data
      .filter((flag) => flag.classification === 'grammar_error')
      .map((flag) => ({
        title: flag.errorType ?? 'grammar',
        detail: `${flag.verbatimText} → ${flag.normalizedText}`,
        tone: 'watch' as const,
        evidence: flag.corpusEvidence ?? flag.explanation,
      }));
  }).slice(0, 6);
}

function naturalnessItems(flags: readonly SpeechNaturalnessInput[]): DayFeedbackItem[] {
  return flags.slice(0, 6).map((flag) => ({
    title: flag.flagType,
    detail: `${flag.originalPhrase} → ${flag.suggestedPhrase}`,
    tone: flag.confidence === 'high' ? 'watch' : 'neutral',
    evidence: flag.collocationMetric !== null && flag.metricValue !== null
      ? `${flag.collocationMetric}: ${flag.metricValue.toFixed(1)}`
      : flag.rationale,
  }));
}

function wordBankItems(items: readonly SpeechWordBankInput[]): DayFeedbackItem[] {
  return items.slice(0, 8).map((item) => ({
    title: item.text,
    detail: `${item.category} · ${item.masteryState} · used ${item.usageCount}x`,
    tone: item.isActiveTarget ? 'good' : 'neutral',
    evidence: null,
  }));
}

function category(
  input: {
    key: DaySpeechQualityCategory['key'];
    label: string;
    metrics: DayMetricSummary[];
    items: DayFeedbackItem[];
    emptyState: string | null;
  },
): DaySpeechQualityCategory {
  const score = scoreFromMetrics(input.metrics);
  const summary =
    score === null ? input.emptyState ?? 'No evidence for this category yet.' : `${input.label} averaged ${score.toFixed(1)}/10 today.`;
  return { ...input, score, summary };
}

/** Builds hierarchical Speech Quality categories from raw session evidence. */
export function buildDaySpeechQuality(
  input: BuildDaySpeechQualityInput,
): DaySpeechQualityData {
  const grammarMetrics = collectMetrics(input.sessions, CATEGORY_METRICS.grammar);
  const vocabularyMetrics = collectMetrics(input.sessions, CATEGORY_METRICS.vocabulary);
  const structureMetrics = collectMetrics(input.sessions, CATEGORY_METRICS.structure);
  const registerMetrics = collectMetrics(input.sessions, CATEGORY_METRICS.register);
  const categories: DaySpeechQualityCategory[] = [
    category({
      key: 'grammar',
      label: 'Grammar',
      metrics: grammarMetrics,
      items: [...parseGrammarItems(input.sessions), ...insightItems(input.sessions, 'grammar')],
      emptyState: 'Grammar evidence is limited for this day.',
    }),
    category({
      key: 'vocabulary',
      label: 'Vocabulary',
      metrics: vocabularyMetrics,
      items: insightItems(input.sessions, 'vocabulary'),
      emptyState: 'Vocabulary evidence is limited for this day.',
    }),
    category({
      key: 'structure',
      label: 'Structure',
      metrics: structureMetrics,
      items: insightItems(input.sessions, 'structure'),
      emptyState: 'Structure evidence is limited for this day.',
    }),
  ];

  if (input.sourceAvailability.naturalness) {
    categories.push(category({
      key: 'naturalness',
      label: 'Naturalness',
      metrics: [],
      items: naturalnessItems(input.naturalnessFlags),
      emptyState: 'No naturalness flags for this day.',
    }));
  }
  if (input.sourceAvailability.languageBank) {
    categories.push(category({
      key: 'wordBank',
      label: 'Word Bank',
      metrics: [],
      items: wordBankItems(input.wordBankItems),
      emptyState: 'No vocabulary tracked yet.',
    }));
  }
  if (input.sessions.some((session) => session.registerFeedback !== null)) {
    categories.splice(3, 0, category({
      key: 'register',
      label: 'Register & Pragmatics',
      metrics: registerMetrics,
      items: insightItems(input.sessions, 'register'),
      emptyState: 'No register feedback for this day.',
    }));
  }

  return { categories, sourceAvailability: input.sourceAvailability };
}
