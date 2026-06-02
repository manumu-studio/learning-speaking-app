// View-model hook for SessionDoneView — derives animation delays, drill config, and start-drill handler
'use client';

import { useRouter } from 'next/navigation';
import { METRIC_LABELS } from '@/features/dashboard/pillars';
import { PronunciationReportSchema } from '@/components/ui/PronunciationSection';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';
import type { SessionDetail, SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';
import type { DrillType } from '@/features/training/training.types';
import type { FocusComparison } from './sessionResults.helpers';
import {
  METRIC_DRILL_MAP,
  pickWeakestMetric,
  collectRecentExamplesForDrill,
  focusPatternForDrill,
  drillCreatedSchema,
} from './sessionResults.helpers';

export interface AnimationDelays {
  pronunciationSectionDelay: number;
  wordColorMapDelay: number;
  prosodyPanelDelay: number;
  focusHighlightDelay: number;
  focusBannerDelay: number;
  transcriptDelay: number;
}

export interface DrillViewModel {
  weakestSnapshot: SessionMetricSnapshot | null;
  drillConfig: { drillType: DrillType; timeLimit: number } | undefined;
  weakestLabel: string;
  onStartDrill: (drillType: DrillType, metricKey: string) => Promise<void>;
}

export interface SessionDoneViewModel {
  pronunciationReport: PronunciationReport | null;
  delays: AnimationDelays;
  drill: DrillViewModel;
  hasChunkBreakdown: boolean;
}

function parsePronunciationReport(raw: SessionDetail['pronunciationReport']): PronunciationReport | null {
  if (raw === null || raw === undefined) return null;
  const result = PronunciationReportSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function buildDelays(
  insightCount: number,
  hasPronunciation: boolean,
  focusComparison: FocusComparison | null,
): AnimationDelays {
  const baseDelay = 200;
  const insightDelay = baseDelay + insightCount * 100;
  const pronunciationBlockOffset = hasPronunciation ? 300 : 0;
  const pronunciationSectionDelay = insightDelay + 100;
  const wordColorMapDelay = pronunciationSectionDelay + 100;
  const prosodyPanelDelay = wordColorMapDelay + 100;
  const focusHighlightDelay = insightDelay + pronunciationBlockOffset + 100;
  const focusBannerDelay = insightDelay + pronunciationBlockOffset + (focusComparison ? 200 : 100);
  const transcriptDelay = insightDelay + pronunciationBlockOffset + (focusComparison ? 300 : 200);
  return {
    pronunciationSectionDelay,
    wordColorMapDelay,
    prosodyPanelDelay,
    focusHighlightDelay,
    focusBannerDelay,
    transcriptDelay,
  };
}

export function useSessionDoneViewModel(
  session: SessionDetail,
  focusComparison: FocusComparison | null,
): SessionDoneViewModel {
  const router = useRouter();

  const pronunciationReport = parsePronunciationReport(session.pronunciationReport);

  const delays = buildDelays(
    session.insights.length,
    pronunciationReport !== null,
    focusComparison,
  );

  const metrics = session.metrics ?? [];
  const weakestSnapshot = pickWeakestMetric(metrics);
  const drillConfig = weakestSnapshot !== null ? METRIC_DRILL_MAP[weakestSnapshot.key] : undefined;
  const weakestLabel =
    weakestSnapshot !== null ? (METRIC_LABELS[weakestSnapshot.key] ?? weakestSnapshot.key) : '';

  const hasChunkBreakdown =
    session.isChunked === true &&
    session.chunks !== undefined &&
    session.chunks.length > 0;

  const onStartDrill = async (drillType: DrillType, metricKey: string): Promise<void> => {
    const recentExamples = collectRecentExamplesForDrill(session);
    const focusPattern = focusPatternForDrill(session);
    const res = await fetch('/api/drills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        drillType,
        metricKey,
        recentExamples,
        focusPattern,
      }),
    });
    if (!res.ok) return;
    const result = drillCreatedSchema.safeParse(await res.json());
    if (!result.success) return;
    router.push(`/drill/${result.data.id}`);
  };

  return {
    pronunciationReport,
    delays,
    drill: { weakestSnapshot, drillConfig, weakestLabel, onStartDrill },
    hasChunkBreakdown,
  };
}
