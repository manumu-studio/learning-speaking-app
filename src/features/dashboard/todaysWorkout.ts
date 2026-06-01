// Recommendation engine — derives today's workout focus from dashboard data client-side

import type { DashboardData, MetricKey } from './dashboard.types';
import type { PillarKey } from './pillars';
import { PILLAR_CONFIG, PILLAR_KEYS } from './pillars';

export type PromptEntry = {
  id: string;
  metricKey: string;
  title: string;
  prompt: string;
};

export type WorkoutRecommendation =
  | {
      kind: 'workout';
      metricKey: MetricKey;
      metricLabel: string;
      pillarKey: PillarKey;
      pillarLabel: string;
      coachingTip: string;
      promptSuggestion: PromptEntry | null;
      drillSuggestion: boolean;
    }
  | { kind: 'rest'; message: string }
  | { kind: 'welcome'; message: string };

const DRILLABLE_METRIC_KEYS = new Set<MetricKey>([
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
]);

const FALLBACK_TIPS: Record<MetricKey, string> = {
  connectorRepetition:
    "Vary your transitions — try 'however', 'that said', and 'in contrast' instead of repeating 'so'.",
  structuralVariety:
    'Mix up your sentence length. Short punchy sentences after longer ones create natural rhythm.',
  vocabularyPrecision:
    'Replace vague words with specific ones — "important" → "critical", "good" → "effective".',
  verbAccuracy:
    'Match tense to timeline. Past events use simple past; ongoing states use present perfect.',
  argumentClosure:
    'End each point with a one-sentence summary before moving on — tie the argument closed.',
  fillerUsage:
    "Pause instead of filling silence. A half-second pause sounds more confident than 'um' or 'like'.",
  lexicalSophistication:
    'Swap one common word per sentence for a more precise alternative — "important" → "pivotal".',
  registerPragmatics:
    'Match your tone to the situation — add hedging phrases like "it might be worth" in professional contexts.',
  pronunciationAccuracy: 'Slow down on consonant clusters. Precision beats speed.',
  prosodyScore: 'Vary your pitch on stressed syllables to sound more expressive.',
  speakingRate:
    'Match your pace to your content — slow down for complex ideas, pick up for familiar ones.',
};

function pillarOf(key: MetricKey): PillarKey {
  for (const pillarKey of PILLAR_KEYS) {
    if ((PILLAR_CONFIG[pillarKey].metricKeys as readonly string[]).includes(key)) {
      return pillarKey;
    }
  }
  return 'language';
}

export function computeTodaysWorkout(
  data: DashboardData,
  prompts: PromptEntry[],
): WorkoutRecommendation {
  if (data.totalSessions === 0) {
    return {
      kind: 'welcome',
      message: 'Record your first session to get a personalized workout recommendation.',
    };
  }

  const eligibleMetrics = data.metrics.filter(
    (m) => DRILLABLE_METRIC_KEYS.has(m.key) && m.currentScore > 0,
  );

  if (eligibleMetrics.length === 0) {
    return {
      kind: 'welcome',
      message: 'Record a few more sessions to unlock your first workout recommendation.',
    };
  }

  const allDrilledToday = eligibleMetrics.every((m) => m.lastTrainedToday === true);
  if (allDrilledToday) {
    return {
      kind: 'rest',
      message:
        "You've trained all your patterns today. Great work — come back tomorrow for your next workout.",
    };
  }

  const candidates = eligibleMetrics.filter((m) => !m.lastTrainedToday);
  candidates.sort((a, b) => a.currentScore - b.currentScore);

  let top = candidates[0];
  if (!top) {
    return {
      kind: 'welcome',
      message: 'Record a few more sessions to unlock your first workout recommendation.',
    };
  }

  const runner = candidates[1] ?? null;
  if (
    runner !== null &&
    data.currentFocus !== null &&
    top.key === data.currentFocus &&
    runner.currentScore - top.currentScore <= 1.0
  ) {
    top = runner;
  }

  const pillarKey = pillarOf(top.key);
  const pillarLabel = PILLAR_CONFIG[pillarKey].label;
  const coachingTip = FALLBACK_TIPS[top.key];
  const bestPrompt = prompts.find((p) => p.metricKey === top.key) ?? null;

  return {
    kind: 'workout',
    metricKey: top.key,
    metricLabel: top.label,
    pillarKey,
    pillarLabel,
    coachingTip,
    promptSuggestion: bestPrompt,
    drillSuggestion: true,
  };
}
