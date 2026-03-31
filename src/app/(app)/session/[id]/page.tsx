// Session results page — displays analysis feedback with staggered entrance animations
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { SessionHeader } from '@/components/ui/SessionHeader';
import { InsightsList } from '@/components/ui/InsightsList';
import { FocusNextBanner } from '@/components/ui/FocusNextBanner';
import { FocusHighlight } from '@/components/ui/FocusHighlight';
import { TranscriptSection } from '@/components/ui/TranscriptSection';
import { useSessionStatus } from '@/features/session/useSessionStatus';
import type { SessionDetail, SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';
import { DrillRecommendation } from '@/features/training/DrillRecommendation';
import type { DrillType } from '@/features/training/training.types';
import styles from './SessionResults.module.css';

// Metric key to human-readable label mapping
const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

interface FocusComparison {
  metricLabel: string;
  currentScore: number;
  previousScore: number | null;
}

const METRIC_DRILL_MAP: Record<string, { drillType: DrillType; timeLimit: number }> = {
  connectorRepetition: { drillType: 'rephrase', timeLimit: 60 },
  structuralVariety: { drillType: 'constraint', timeLimit: 90 },
  vocabularyPrecision: { drillType: 'vocabUpgrade', timeLimit: 60 },
  verbAccuracy: { drillType: 'rephrase', timeLimit: 60 },
  argumentClosure: { drillType: 'conclusion', timeLimit: 120 },
  fillerUsage: { drillType: 'precision', timeLimit: 60 },
};

function pickWeakestMetric(metrics: SessionMetricSnapshot[]): SessionMetricSnapshot | null {
  if (metrics.length === 0) return null;
  return [...metrics].sort((a, b) => a.score - b.score)[0] ?? null;
}

function collectRecentExamplesForDrill(session: SessionDetail): string[] {
  const fromInsights = session.insights
    .flatMap((i) => {
      const ex = i.examples;
      if (!Array.isArray(ex)) return [];
      return ex.filter((item): item is string => typeof item === 'string');
    })
    .slice(0, 5);
  if (fromInsights.length > 0) return fromInsights;
  const t = session.transcript?.text?.trim();
  if (t && t.length > 0) return [t.slice(0, Math.min(t.length, 600))];
  return ['General speaking practice'];
}

function focusPatternForDrill(session: SessionDetail): string {
  if (session.focusNext?.trim()) return session.focusNext.trim();
  const first = session.insights[0];
  if (first?.pattern?.trim()) return first.pattern.trim();
  return 'Clear, structured English delivery';
}

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { session, isLoading, isProcessing, isDone, isFailed, retry } = useSessionStatus(id);
  const [focusComparison, setFocusComparison] = useState<FocusComparison | null>(null);

  useEffect(() => {
    const focusKey = session?.focusMetricKey;
    if (!focusKey || !isDone) return;

    const fetchPreviousScore = async () => {
      try {
        const response = await fetch(
          `/api/sessions/${id}/focus-comparison?metricKey=${encodeURIComponent(focusKey)}`
        );
        if (response.ok) {
          const data = (await response.json()) as {
            currentScore: number;
            previousScore: number | null;
          };
          setFocusComparison({
            metricLabel: METRIC_LABELS[focusKey] ?? focusKey,
            currentScore: data.currentScore,
            previousScore: data.previousScore,
          });
        }
      } catch {
        // Focus comparison is optional
      }
    };

    void fetchPreviousScore();
  }, [session, isDone, id]);

  if (isLoading && !session) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700" />
        </div>
      </Container>
    );
  }

  if (isProcessing && session) {
    return (
      <Container>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Processing Your Session
        </h1>
        <ProcessingStatus
          status={session.status as 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED'}
          onRetry={retry}
        />
      </Container>
    );
  }

  if (isFailed && session) {
    return (
      <Container>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Session Results
        </h1>
        <ProcessingStatus
          status="FAILED"
          errorMessage={session.errorMessage}
          onRetry={retry}
        />
      </Container>
    );
  }

  if (isDone && session) {
    const focusHighlightDelay = 200 + session.insights.length * 100 + 100;
    const focusBannerDelay = focusComparison
      ? 200 + session.insights.length * 100 + 200
      : 200 + session.insights.length * 100 + 100;
    const transcriptDelay = focusComparison
      ? 200 + session.insights.length * 100 + 300
      : 200 + session.insights.length * 100 + 200;

    const metrics = session.metrics ?? [];
    const weakestSnapshot = pickWeakestMetric(metrics);
    const drillConfig =
      weakestSnapshot !== null ? METRIC_DRILL_MAP[weakestSnapshot.key] : undefined;
    const weakestLabel =
      weakestSnapshot !== null ? (METRIC_LABELS[weakestSnapshot.key] ?? weakestSnapshot.key) : '';

    const handleStartDrill = async (drillType: DrillType, metricKey: string) => {
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
      const newDrill: unknown = await res.json();
      if (!newDrill || typeof newDrill !== 'object') return;
      const rec = newDrill as Record<string, unknown>;
      if (typeof rec.id !== 'string') return;
      router.push(`/drill/${rec.id}`);
    };

    return (
      <Container>
        <div className={styles.resultsContainer}>
          <SessionHeader
            summary={session.summary}
            durationSecs={session.durationSecs}
            wordCount={session.transcript?.wordCount ?? null}
            insightCount={session.insights.length}
            createdAt={session.createdAt}
            animationDelay={0}
          />

          <InsightsList insights={session.insights} baseDelay={200} />

          {focusComparison && (
            <FocusHighlight
              metricLabel={focusComparison.metricLabel}
              currentScore={focusComparison.currentScore}
              previousScore={focusComparison.previousScore}
              animationDelay={focusHighlightDelay}
            />
          )}

          {weakestSnapshot !== null && drillConfig !== undefined && (
            <DrillRecommendation
              drillType={drillConfig.drillType}
              metricLabel={weakestLabel}
              timeLimit={drillConfig.timeLimit}
              onStartDrill={() => void handleStartDrill(drillConfig.drillType, weakestSnapshot.key)}
              className="mt-6"
            />
          )}

          {session.focusNext && (
            <FocusNextBanner focusNext={session.focusNext} animationDelay={focusBannerDelay} />
          )}

          {session.transcript && (
            <TranscriptSection
              text={session.transcript.text}
              wordCount={session.transcript.wordCount}
              animationDelay={transcriptDelay}
            />
          )}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <p className="py-20 text-center text-gray-500 dark:text-gray-400">Session not found.</p>
    </Container>
  );
}
