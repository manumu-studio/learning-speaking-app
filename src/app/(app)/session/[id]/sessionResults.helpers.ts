// Helper functions and constants for session results page
import { z } from 'zod';
import { InsightExamplesSchema } from '@/lib/schemas/jsonFields';
import type { SessionDetail, SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';
import type { DrillType } from '@/features/training/training.types';
import type { ProcessingPartialData } from '@/components/ui/ProcessingStatus';

export interface FocusComparison {
  metricLabel: string;
  currentScore: number;
  previousScore: number | null;
}

export const METRIC_DRILL_MAP: Record<string, { drillType: DrillType; timeLimit: number }> = {
  connectorRepetition: { drillType: 'rephrase', timeLimit: 60 },
  structuralVariety: { drillType: 'constraint', timeLimit: 90 },
  vocabularyPrecision: { drillType: 'vocabUpgrade', timeLimit: 60 },
  verbAccuracy: { drillType: 'rephrase', timeLimit: 60 },
  argumentClosure: { drillType: 'conclusion', timeLimit: 120 },
  fillerUsage: { drillType: 'precision', timeLimit: 60 },
  pronunciationAccuracy: { drillType: 'pronunciation', timeLimit: 90 },
  prosodyScore: { drillType: 'pronunciation', timeLimit: 90 },
  speakingRate: { drillType: 'pronunciation', timeLimit: 90 },
};

export function buildPartialData(
  session: SessionDetail,
  hasPitchContour: boolean,
): ProcessingPartialData {
  return {
    hasTranscript: session.transcript !== undefined && session.transcript !== null,
    hasPronunciation:
      session.pronunciationReport !== undefined && session.pronunciationReport !== null,
    hasInsights: session.insights.length > 0,
    hasPitchContour,
  };
}

export function pickWeakestMetric(metrics: SessionMetricSnapshot[]): SessionMetricSnapshot | null {
  if (metrics.length === 0) return null;
  return [...metrics].sort((a, b) => a.score - b.score)[0] ?? null;
}

export function collectRecentExamplesForDrill(session: SessionDetail): string[] {
  const fromInsights = session.insights
    .flatMap((i) => {
      const parsed = InsightExamplesSchema.safeParse(i.examples);
      return parsed.success ? parsed.data : [];
    })
    .slice(0, 5);
  if (fromInsights.length > 0) return fromInsights;
  const t = session.transcript?.text?.trim();
  if (t && t.length > 0) return [t.slice(0, Math.min(t.length, 600))];
  return ['General speaking practice'];
}

export function focusPatternForDrill(session: SessionDetail): string {
  if (session.focusNext?.trim()) return session.focusNext.trim();
  const first = session.insights[0];
  if (first?.pattern?.trim()) return first.pattern.trim();
  return 'Clear, structured English delivery';
}

export const focusComparisonSchema = z.object({
  currentScore: z.number(),
  previousScore: z.number().nullable(),
});

export const drillCreatedSchema = z.object({ id: z.string() });
