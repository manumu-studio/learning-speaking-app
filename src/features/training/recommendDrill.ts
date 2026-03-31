// Recommends the best drill for a user based on session metrics and focus priority

import { prisma } from '@/lib/prisma';
import { generateDrill } from './generateDrill';
import type { DrillRecommendation, DrillType } from './training.types';

const METRIC_TO_DRILL: Record<string, DrillType> = {
  connectorRepetition: 'rephrase',
  structuralVariety: 'constraint',
  vocabularyPrecision: 'vocabUpgrade',
  fillerUsage: 'precision',
  verbAccuracy: 'precision',
  argumentClosure: 'conclusion',
};

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

function examplesFromInsights(
  insights: Array<{ examples: unknown; pattern: string; detail: string }>
): string[] {
  for (const insight of insights) {
    const ex = insight.examples;
    if (Array.isArray(ex)) {
      const strings = ex.filter((item): item is string => typeof item === 'string' && item.length > 0);
      if (strings.length > 0) {
        return strings.slice(0, 3);
      }
    }
  }
  return [];
}

export async function recommendDrill(sessionId: string): Promise<DrillRecommendation | null> {
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      focusMetricKey: true,
      transcript: { select: { text: true } },
      insights: {
        select: { pattern: true, detail: true, examples: true },
        orderBy: { severity: 'desc' },
      },
      metrics: {
        select: {
          key: true,
          score: true,
        },
      },
    },
  });

  if (!session || session.metrics.length === 0) {
    return null;
  }

  let targetMetricKey: string;

  if (session.focusMetricKey && METRIC_TO_DRILL[session.focusMetricKey]) {
    targetMetricKey = session.focusMetricKey;
  } else {
    const sorted = [...session.metrics].sort((a, b) => a.score - b.score);
    const lowest = sorted[0];
    if (!lowest) return null;
    targetMetricKey = lowest.key;
  }

  const drillType = METRIC_TO_DRILL[targetMetricKey];
  if (!drillType) return null;

  const metricLabel = METRIC_LABELS[targetMetricKey] ?? targetMetricKey;

  const transcriptText = session.transcript?.text ?? '';
  const sentences = transcriptText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const fromInsights = examplesFromInsights(session.insights);
  const recentExamples = fromInsights.length > 0 ? fromInsights : sentences.slice(0, 3);

  if (recentExamples.length === 0) {
    return null;
  }

  const firstInsight = session.insights[0];
  const focusPattern =
    firstInsight !== undefined
      ? `${firstInsight.pattern}: ${firstInsight.detail}`.slice(0, 200)
      : `Needs improvement on ${metricLabel}`;

  const drillPrompt = await generateDrill({
    drillType,
    metricKey: targetMetricKey,
    recentExamples,
    focusPattern,
  });

  return {
    drillType: drillPrompt.drillType,
    metricKey: targetMetricKey,
    metricLabel,
    prompt: drillPrompt.prompt,
    sourceExample: drillPrompt.sourceExample,
    timeLimit: drillPrompt.timeLimit,
  };
}
