// Session results page — displays analysis feedback with staggered entrance animations
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { InsightExamplesSchema } from '@/lib/schemas/jsonFields';
import { Container } from '@/components/ui/Container';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { SessionHeader } from '@/components/ui/SessionHeader';
import {
  PersonalRecordBanner,
  usePersonalRecordBanner,
} from '@/components/ui/PersonalRecordBanner';
import { InsightsList } from '@/components/ui/InsightsList';
import type { InsightData } from '@/components/ui/InsightsList';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { PILLAR_CONFIG, PILLAR_KEYS } from '@/features/dashboard/pillars';
import type { PillarKey } from '@/features/dashboard/pillars';
import { FocusNextBanner } from '@/components/ui/FocusNextBanner';
import { FocusHighlight } from '@/components/ui/FocusHighlight';
import { AnnotatedTranscript } from '@/components/ui/AnnotatedTranscript';
import {
  PronunciationSection,
  PronunciationReportSchema,
} from '@/components/ui/PronunciationSection';
import { WordColorMap } from '@/components/ui/WordColorMap';
import { ProsodyPanel } from '@/components/ui/ProsodyPanel';
import { PronunciationTipsCard } from '@/components/ui/PronunciationTipsCard';
import { PronunciationProgress, PronunciationHistorySchema } from '@/components/ui/PronunciationProgress';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import { PracticeSuggestion } from '@/components/ui/PracticeSuggestion';
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
  pronunciationAccuracy: 'Pronunciation Accuracy',
  prosodyScore: 'Prosody & Rhythm',
  speakingRate: 'Speaking Rate',
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
  pronunciationAccuracy: { drillType: 'pronunciation', timeLimit: 90 },
  prosodyScore: { drillType: 'pronunciation', timeLimit: 90 },
  speakingRate: { drillType: 'pronunciation', timeLimit: 90 },
};

function pickWeakestMetric(metrics: SessionMetricSnapshot[]): SessionMetricSnapshot | null {
  if (metrics.length === 0) return null;
  return [...metrics].sort((a, b) => a.score - b.score)[0] ?? null;
}

function collectRecentExamplesForDrill(session: SessionDetail): string[] {
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

function focusPatternForDrill(session: SessionDetail): string {
  if (session.focusNext?.trim()) return session.focusNext.trim();
  const first = session.insights[0];
  if (first?.pattern?.trim()) return first.pattern.trim();
  return 'Clear, structured English delivery';
}

/** Compute per-pillar average scores from a session's metric snapshots. */
function computeSessionPillarAverages(
  metrics: SessionMetricSnapshot[],
): Record<PillarKey, number> {
  const result = {} as Record<PillarKey, number>;

  for (const pillarKey of PILLAR_KEYS) {
    const config = PILLAR_CONFIG[pillarKey];
    const constituent = metrics.filter((m) =>
      (config.metricKeys as readonly string[]).includes(m.key),
    );
    if (constituent.length === 0) {
      result[pillarKey] = 0;
    } else {
      const sum = constituent.reduce((acc, m) => acc + m.score, 0);
      result[pillarKey] = sum / constituent.length;
    }
  }

  return result;
}

interface PillarHeroRowProps {
  metrics: SessionMetricSnapshot[];
}

function PillarHeroRow({ metrics }: PillarHeroRowProps) {
  const averages = computeSessionPillarAverages(metrics);

  return (
    <div
      className="mt-4 grid grid-cols-3 gap-3"
      aria-label="Pillar performance summary"
    >
      {PILLAR_KEYS.map((pillarKey) => {
        const config = PILLAR_CONFIG[pillarKey];
        const score = averages[pillarKey];
        return (
          <div
            key={pillarKey}
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {config.label}
            </span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {score > 0 ? score.toFixed(1) : '—'}
            </span>
            {score > 0 && <ScoreChip score={score} scale="ten" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Split insights into "went well" and "to sharpen" groups for coaching-first ordering.
 */
function splitInsightsBySentiment(
  insights: InsightData[],
  metrics: SessionMetricSnapshot[],
): { wentWell: InsightData[]; toSharpen: InsightData[] } {
  const scoreByCategory = new Map<string, number>();
  for (const m of metrics) {
    scoreByCategory.set(m.key.toLowerCase(), m.score);
  }

  const wentWell: InsightData[] = [];
  const toSharpen: InsightData[] = [];

  for (const insight of insights) {
    const categoryKey = insight.category.toLowerCase().replace(/\s/g, '');
    const metricScore = scoreByCategory.get(categoryKey) ?? null;

    const isHighSeverity =
      insight.severity === 'high' || insight.severity === 'medium';

    const isStrongScore = metricScore !== null && metricScore >= 7;
    const isLowSeverity = insight.severity === null || insight.severity === 'low';

    if (isStrongScore || (isLowSeverity && !isHighSeverity)) {
      wentWell.push(insight);
    } else {
      toSharpen.push(insight);
    }
  }

  return { wentWell, toSharpen };
}

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { session, isLoading, isProcessing, isDone, isFailed, retry } = useSessionStatus(id);
  const { personalRecords } = usePersonalRecordBanner({ sessionId: id, isDone });
  const [focusComparison, setFocusComparison] = useState<FocusComparison | null>(null);
  const [pronunciationHistory, setPronunciationHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const focusKey = session?.focusMetricKey;
    if (!focusKey || !isDone) return;

    const fetchPreviousScore = async () => {
      try {
        const response = await fetch(
          `/api/sessions/${id}/focus-comparison?metricKey=${encodeURIComponent(focusKey)}`
        );
        if (response.ok) {
          const focusComparisonSchema = z.object({
            currentScore: z.number(),
            previousScore: z.number().nullable(),
          });
          const data = focusComparisonSchema.parse(await response.json());
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

  useEffect(() => {
    if (!isDone || session?.pronunciationReport === null || session?.pronunciationReport === undefined) {
      return;
    }

    void fetch(`/api/sessions/${id}/pronunciation-history`)
      .then(async (res) => {
        if (!res.ok) return;
        const json: unknown = await res.json();
        const parsed = PronunciationHistorySchema.safeParse(json);
        if (parsed.success) setPronunciationHistory(parsed.data.history);
      })
      .catch(() => undefined);
  }, [id, isDone, session?.pronunciationReport]);

  if (isLoading && !session) {
    return (
      <Container>
        <div
          className="flex flex-col items-center justify-center gap-3 py-20"
          aria-live="polite"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700" />
          <span className="sr-only">Loading workout</span>
        </div>
      </Container>
    );
  }

  if (isProcessing && session) {
    return (
      <Container>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Processing Your Workout
        </h1>
        <ProcessingStatus
          status={session.status}
          onRetry={retry}
        />
      </Container>
    );
  }

  if (isFailed && session) {
    return (
      <Container>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Workout Results
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
    const pronunciationReport = (() => {
      if (session.pronunciationReport === null || session.pronunciationReport === undefined) {
        return null;
      }
      const result = PronunciationReportSchema.safeParse(session.pronunciationReport);
      return result.success ? result.data : null;
    })();

    const baseDelay = 200;
    const insightDelay = baseDelay + session.insights.length * 100;
    const pronunciationBlockOffset = pronunciationReport !== null ? 300 : 0;
    const pronunciationSectionDelay = insightDelay + 100;
    const wordColorMapDelay = pronunciationSectionDelay + 100;
    const prosodyPanelDelay = wordColorMapDelay + 100;
    const focusHighlightDelay = insightDelay + pronunciationBlockOffset + 100;
    const focusBannerDelay = insightDelay + pronunciationBlockOffset + (focusComparison ? 200 : 100);
    const transcriptDelay = insightDelay + pronunciationBlockOffset + (focusComparison ? 300 : 200);

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
      const drillCreatedSchema = z.object({ id: z.string() });
      const result = drillCreatedSchema.safeParse(await res.json());
      if (!result.success) return;
      router.push(`/drill/${result.data.id}`);
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
            {...(session.workoutNumber !== undefined
              ? { workoutNumber: session.workoutNumber }
              : {})}
            animationDelay={0}
          />

          {personalRecords.length > 0 && (
            <PersonalRecordBanner
              personalRecords={personalRecords}
              animationDelay={100}
            />
          )}

          {session.metrics && session.metrics.length > 0 && (
            <PillarHeroRow metrics={session.metrics} />
          )}

          {(() => {
            const { wentWell, toSharpen } = splitInsightsBySentiment(
              session.insights,
              session.metrics ?? [],
            );
            const hasBothSections = wentWell.length > 0 && toSharpen.length > 0;

            return (
              <div className="mt-4 flex flex-col gap-6">
                {hasBothSections ? (
                  <>
                    <section aria-labelledby="went-well-heading">
                      <h3
                        id="went-well-heading"
                        className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        What went well
                      </h3>
                      <InsightsList insights={wentWell} baseDelay={200} />
                    </section>
                    <section aria-labelledby="to-sharpen-heading">
                      <h3
                        id="to-sharpen-heading"
                        className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        What to sharpen
                      </h3>
                      <InsightsList
                        insights={toSharpen}
                        baseDelay={200 + wentWell.length * 80}
                      />
                    </section>
                  </>
                ) : (
                  <InsightsList insights={session.insights} baseDelay={200} />
                )}
              </div>
            );
          })()}

          {pronunciationReport !== null && (
            <div className="space-y-6">
              <PronunciationSection
                pronunciationReport={pronunciationReport}
                animationDelay={pronunciationSectionDelay}
                {...(pronunciationHistory.length >= 2
                  ? {
                      progressChip: {
                        metricLabel: 'Fluency',
                        deltaPercent: Math.round(
                          (pronunciationHistory[pronunciationHistory.length - 1]?.fluencyScore ?? 0) -
                            (pronunciationHistory[pronunciationHistory.length - 2]?.fluencyScore ?? 0)
                        ),
                      },
                    }
                  : {})}
              />
              <WordColorMap
                words={pronunciationReport.words}
                animationDelay={wordColorMapDelay}
              />
              <ProsodyPanel
                words={pronunciationReport.words}
                speakingRateWpm={pronunciationReport.speakingRateWpm}
                prosodyScore={pronunciationReport.prosodyScore}
                animationDelay={prosodyPanelDelay}
              />
              <PronunciationTipsCard
                pronunciationReport={pronunciationReport}
                animationDelay={prosodyPanelDelay + 100}
              />
              <PracticeSuggestion
                pronunciationReport={pronunciationReport}
                animationDelay={prosodyPanelDelay + 200}
              />
              <PronunciationProgress
                currentSessionId={session.id}
                history={pronunciationHistory}
                animationDelay={prosodyPanelDelay + 300}
              />
            </div>
          )}

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
            <AnnotatedTranscript
              text={session.transcript.text}
              wordCount={session.transcript.wordCount}
              insights={session.insights}
              metrics={session.metrics ?? []}
              animationDelay={transcriptDelay}
            />
          )}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <p className="py-20 text-center text-gray-500 dark:text-gray-400">Workout not found.</p>
    </Container>
  );
}
