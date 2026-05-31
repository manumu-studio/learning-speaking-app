// Recommends the best drill for a user based on session metrics and focus priority

import { prisma } from '@/lib/prisma';
import { InsightExamplesSchema } from '@/lib/schemas/jsonFields';
import { generateDrill } from './generateDrill';
import type { DrillRecommendation, DrillType } from './training.types';
import { METRIC_LABELS } from '@/features/dashboard/pillars';

const METRIC_TO_DRILL: Record<string, DrillType> = {
  connectorRepetition: 'rephrase',
  structuralVariety: 'constraint',
  vocabularyPrecision: 'vocabUpgrade',
  fillerUsage: 'precision',
  verbAccuracy: 'precision',
  argumentClosure: 'conclusion',
};

function examplesFromInsights(
  insights: Array<{ examples: unknown; pattern: string; detail: string }>
): string[] {
  for (const insight of insights) {
    const parsed = InsightExamplesSchema.safeParse(insight.examples);
    if (parsed.success) {
      const strings = parsed.data.filter((s) => s.length > 0);
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
      intentLabel: true,
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
    intentLabel: session.intentLabel,
    sessionTranscript: transcriptText,
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
