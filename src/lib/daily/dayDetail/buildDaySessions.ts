// Builds the Sessions section for a day-detail meta-session
import type { DaySessionMetric, DaySessionSummary } from './buildDayDetailData.types';

const SPEECH_METRIC_LABELS: Record<string, string> = {
  verbAccuracy: 'Grammar',
  vocabularyPrecision: 'Vocabulary',
  lexicalSophistication: 'Vocabulary',
  structuralVariety: 'Structure',
  argumentClosure: 'Structure',
  connectorRepetition: 'Connectors',
  registerPragmatics: 'Register',
};

const SPEECH_QUALITY_KEYS = new Set(Object.keys(SPEECH_METRIC_LABELS));

export interface DaySessionMetricInput {
  readonly key: string;
  readonly score: number;
  readonly note: string | null;
}

export interface DaySessionPronunciationInput {
  readonly pronScore: number;
  readonly fluencyScore: number;
  readonly prosodyScore: number;
}

export interface DaySessionInput {
  readonly id: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly durationSecs: number | null;
  readonly intentLabel: string | null;
  readonly topic: string | null;
  readonly promptUsed: string | null;
  readonly transcript: { readonly wordCount: number | null } | null;
  readonly metrics: readonly DaySessionMetricInput[];
  readonly pronunciationReport: DaySessionPronunciationInput | null;
}

export interface BuildDaySessionsInput {
  readonly sessions: readonly DaySessionInput[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeScore(score: number): string {
  return `${Math.round(score)}/10`;
}

function metricTone(score: number): DaySessionMetric['tone'] {
  if (score >= 8) return 'good';
  if (score <= 5) return 'watch';
  return 'neutral';
}

function buildTopic(session: DaySessionInput): string {
  return session.intentLabel ?? session.topic ?? session.promptUsed ?? 'Speaking practice';
}

function buildPronunciationMetric(
  report: DaySessionPronunciationInput | null,
): DaySessionMetric | null {
  if (report === null) return null;
  const fluency = Math.round(report.fluencyScore);
  const prosody = Math.round(report.prosodyScore);
  const value = fluency <= prosody ? `${fluency}% fluency` : `${prosody}% prosody`;
  return {
    label: fluency <= prosody ? 'Fluency' : 'Prosody',
    value,
    tone: Math.min(fluency, prosody) >= 80 ? 'good' : 'watch',
  };
}

function buildSpeechMetric(metrics: readonly DaySessionMetricInput[]): DaySessionMetric | null {
  const candidates = metrics
    .filter((metric) => SPEECH_QUALITY_KEYS.has(metric.key))
    .sort((a, b) => a.score - b.score);
  const selected = candidates[0];
  if (selected === undefined) return null;
  return {
    label: SPEECH_METRIC_LABELS[selected.key] ?? selected.key,
    value: normalizeScore(selected.score),
    tone: metricTone(selected.score),
  };
}

/** Builds navigation rows for the completed sessions in a day. */
export function buildDaySessions(
  input: BuildDaySessionsInput,
): DaySessionSummary[] {
  return input.sessions
    .filter((session) => session.status === 'DONE')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((session, index) => ({
      id: session.id,
      href: `/session/${session.id}`,
      sessionNumber: index + 1,
      timeLabel: formatTime(session.createdAt),
      topic: buildTopic(session),
      durationSecs: session.durationSecs ?? 0,
      wordCount: session.transcript?.wordCount ?? 0,
      pronunciationMetric: buildPronunciationMetric(session.pronunciationReport),
      speechMetric: buildSpeechMetric(session.metrics),
    }));
}
