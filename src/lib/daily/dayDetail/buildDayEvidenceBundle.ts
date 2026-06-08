// Collects raw session evidence into a flat bundle for deterministic day-feedback builders
import { z } from 'zod';
import type {
  DayEvidenceInsight, DayEvidenceMetric, DayEvidenceGrammarIssue,
  DayEvidenceNaturalnessFlag, DayEvidencePronunciationSummary,
  DayEvidenceBankItem, DayEvidenceBundle,
} from './buildDayEvidenceBundle.types';
export type {
  DayEvidenceInsight, DayEvidenceMetric, DayEvidenceGrammarIssue,
  DayEvidenceNaturalnessFlag, DayEvidencePronunciationSummary,
  DayEvidenceBankItem, DayEvidenceBundle,
};

// ---------------------------------------------------------------------------
// Input type (matches fetchSessions return shape)
// ---------------------------------------------------------------------------

interface SessionInput {
  readonly transcript: { readonly text: string; readonly improvedText: string | null; readonly wordCount: number | null } | null;
  readonly verbatimWordCount: number | null;
  readonly insights: ReadonlyArray<{ readonly category: string; readonly pattern: string; readonly detail: string; readonly suggestion: string | null }>;
  readonly metrics: ReadonlyArray<{ readonly key: string; readonly score: number; readonly note: string | null }>;
  readonly grammarFlags: unknown;
  readonly naturalness: ReadonlyArray<{
    readonly originalPhrase: string;
    readonly suggestedPhrase: string;
    readonly flagType: string;
    readonly confidence: string | null;
    readonly collocationMetric: string | null;
    readonly metricValue: number | null;
    readonly rationale: string | null;
  }>;
  readonly pronunciationReport: {
    readonly accuracyScore: number;
    readonly fluencyScore: number;
    readonly prosodyScore: number;
    readonly words: ReadonlyArray<{
      readonly word: string;
      readonly accuracyScore: number;
      readonly errorType: string;
    }>;
  } | null;
}

// ---------------------------------------------------------------------------
// Zod schema for grammar flags JSON
// ---------------------------------------------------------------------------

const GrammarFlagSchema = z.object({
  verbatimText: z.string().optional().default(''),
  normalizedText: z.string().optional().default(''),
  classification: z.string().optional().default(''),
  errorType: z.string().optional().default('unknown'),
  explanation: z.string().optional().default(''),
  suggestion: z.string().optional().default(''),
});

const GrammarFlagsArraySchema = z.array(GrammarFlagSchema);

// ---------------------------------------------------------------------------
// Pillar metric key mapping (sourced from PILLAR_CONFIG)
// ---------------------------------------------------------------------------

import { PILLAR_CONFIG } from '@/features/dashboard/pillars';

const DELIVERY_KEYS = new Set<string>(PILLAR_CONFIG.delivery.metricKeys);
const LANGUAGE_KEYS = new Set<string>(PILLAR_CONFIG.language.metricKeys);
const PRONUNCIATION_KEYS = new Set<string>(PILLAR_CONFIG.pronunciation.metricKeys);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function averageOrNull(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function pillarAvg(
  metricRows: readonly DayEvidenceMetric[],
  keySet: ReadonlySet<string>,
): number | null {
  const scores = metricRows.filter((m) => keySet.has(m.key)).map((m) => m.score);
  return averageOrNull(scores);
}

function computeFocusAreas(metricRows: readonly DayEvidenceMetric[]): string[] {
  const byKey = new Map<string, number[]>();
  for (const m of metricRows) {
    const arr = byKey.get(m.key) ?? [];
    arr.push(m.score);
    byKey.set(m.key, arr);
  }
  return [...byKey.entries()]
    .map(([key, scores]) => ({ key, avg: averageOrNull(scores) ?? 0 }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)
    .map((entry) => entry.key);
}

function computeTotalWords(sessions: readonly SessionInput[]): number {
  return sessions.reduce(
    (sum, s) => sum + (s.transcript?.wordCount ?? s.verbatimWordCount ?? 0),
    0,
  );
}

function parseGrammarFlags(raw: unknown): DayEvidenceGrammarIssue[] {
  const parsed = GrammarFlagsArraySchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.map((flag) => ({
    original: flag.verbatimText,
    corrected: flag.normalizedText,
    rule: flag.errorType,
  }));
}

function collectNaturalnessFlags(sessions: readonly SessionInput[]): DayEvidenceNaturalnessFlag[] {
  return sessions.flatMap((s) =>
    s.naturalness.map((flag) => ({
      originalPhrase: flag.originalPhrase,
      suggestedPhrase: flag.suggestedPhrase,
      flagType: flag.flagType,
      rationale: flag.rationale ?? '',
    })),
  );
}

function buildPronunciationSummary(sessions: readonly SessionInput[]): DayEvidencePronunciationSummary {
  const reports = sessions
    .map((s) => s.pronunciationReport)
    .filter((r): r is NonNullable<SessionInput['pronunciationReport']> => r !== null);

  if (reports.length === 0) {
    return { avgAccuracy: null, avgFluency: null, avgProsody: null, prioritySounds: [], repeatedSounds: [] };
  }

  const problemWords = reports
    .flatMap((r) => r.words)
    .filter((w) => w.errorType !== 'None' && w.accuracyScore < 60)
    .map((w) => w.word.toLowerCase());

  const frequency = new Map<string, number>();
  for (const word of problemWords) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  const repeatedSounds = [...frequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 5);

  const unique = [...new Set(problemWords)].slice(0, 10);

  return {
    avgAccuracy: averageOrNull(reports.map((r) => r.accuracyScore)),
    avgFluency: averageOrNull(reports.map((r) => r.fluencyScore)),
    avgProsody: averageOrNull(reports.map((r) => r.prosodyScore)),
    prioritySounds: unique,
    repeatedSounds,
  };
}

function extractVocabUpgrades(sessions: readonly SessionInput[]): string[] {
  const upgrades = new Set<string>();
  for (const session of sessions) {
    if (session.transcript === null || session.transcript.improvedText === null) continue;
    const originalWords = new Set(session.transcript.text.toLowerCase().split(/\s+/));
    const improvedWords = session.transcript.improvedText.toLowerCase().split(/\s+/);
    for (const word of improvedWords) {
      const cleaned = word.replace(/[^a-z'-]/g, '');
      if (cleaned.length > 2 && !originalWords.has(cleaned)) {
        upgrades.add(cleaned);
      }
    }
  }
  return [...upgrades].slice(0, 30);
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/** Aggregates raw session data into a flat evidence bundle for deterministic feedback builders. */
export function buildDayEvidenceBundle(
  sessions: readonly SessionInput[],
  existingBankItems: readonly DayEvidenceBankItem[],
  date: string,
): DayEvidenceBundle {
  const allMetrics: DayEvidenceMetric[] = sessions.flatMap((s) =>
    s.metrics.map((m) => ({ key: m.key, score: m.score })),
  );

  return {
    date,
    sessionCount: sessions.length,
    totalWords: computeTotalWords(sessions),
    pillarScores: {
      delivery: pillarAvg(allMetrics, DELIVERY_KEYS),
      language: pillarAvg(allMetrics, LANGUAGE_KEYS),
      pronunciation: pillarAvg(allMetrics, PRONUNCIATION_KEYS),
    },
    focusAreas: computeFocusAreas(allMetrics),
    allInsights: sessions.flatMap((s) =>
      s.insights.map((i) => ({
        category: i.category,
        pattern: i.pattern,
        detail: i.detail,
        suggestion: i.suggestion ?? '',
      })),
    ),
    allMetrics,
    grammarIssues: sessions.flatMap((s) => parseGrammarFlags(s.grammarFlags)),
    naturalnessFlags: collectNaturalnessFlags(sessions),
    pronunciationSummary: buildPronunciationSummary(sessions),
    wordsUsedToday: extractVocabUpgrades(sessions),
    existingBankItems,
  };
}
