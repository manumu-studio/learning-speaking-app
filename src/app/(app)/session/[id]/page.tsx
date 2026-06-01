// Session results page — displays analysis feedback with staggered entrance animations
'use client';

import { use, useEffect, useState, Suspense } from 'react';
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
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { InsightCard } from '@/components/ui/InsightCard';
import { InsightsList } from '@/components/ui/InsightsList';
import { VocabSuggestions } from '@/components/ui/VocabSuggestions';
import type { VocabSuggestion } from '@/components/ui/VocabSuggestions';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { PILLAR_CONFIG, PILLAR_KEYS, METRIC_LABELS } from '@/features/dashboard/pillars';
import type { PillarKey } from '@/features/dashboard/pillars';
import { PillarTooltip, usePillarTooltip } from '@/components/ui/PillarTooltip';
import { FocusNextBanner } from '@/components/ui/FocusNextBanner';
import { FocusHighlight } from '@/components/ui/FocusHighlight';
import { AnnotatedTranscript } from '@/components/ui/AnnotatedTranscript';
import { TranscriptToggle } from '@/components/ui/TranscriptToggle';
import {
  PronunciationSection,
  PronunciationReportSchema,
} from '@/components/ui/PronunciationSection';
import { WordColorMap } from '@/components/ui/WordColorMap';
import { ProsodyPanel } from '@/components/ui/ProsodyPanel';
import { ProsodyFeedback } from '@/components/ui/ProsodyFeedback';
import { PronunciationTipsCard } from '@/components/ui/PronunciationTipsCard';
import { PronunciationProgress, PronunciationHistorySchema } from '@/components/ui/PronunciationProgress';
import { PhonemePatterns } from '@/components/ui/PhonemePatterns';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';
import { VocabProgress } from '@/components/ui/VocabProgress';
import type { VocabItem } from '@/components/ui/VocabProgress';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import { PracticeSuggestion } from '@/components/ui/PracticeSuggestion';
import { ChunkBreakdown } from '@/components/ui/ChunkBreakdown';
import { PitchContour, usePitchContour } from '@/components/ui/PitchContour';
import { useSessionStatus } from '@/features/session/useSessionStatus';
import type { SessionDetail, SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';
import { DrillRecommendation } from '@/features/training/DrillRecommendation';
import type { DrillType } from '@/features/training/training.types';
import type { ProcessingPartialData } from '@/components/ui/ProcessingStatus';
import styles from './SessionResults.module.css';

function buildPartialData(
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

// METRIC_LABELS imported from @/features/dashboard/pillars (single source of truth)

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
  const { getTriggerProps, getTooltipProps } = usePillarTooltip();

  return (
    <div
      className="mt-4 grid grid-cols-3 gap-3"
      aria-label="Pillar performance summary"
    >
      {PILLAR_KEYS.map((pillarKey) => {
        const config = PILLAR_CONFIG[pillarKey];
        const score = averages[pillarKey];
        const trigger = getTriggerProps(pillarKey);
        const tooltip = getTooltipProps(pillarKey);
        return (
          <div key={pillarKey} className="relative">
            <div
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600"
              {...trigger}
            >
              <span className="text-xs font-medium text-slate-500 dark:text-sky-300/70">
                {config.label}
              </span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {score > 0 ? score.toFixed(1) : '—'}
              </span>
              {score > 0 && <ScoreChip score={score} scale="ten" />}
            </div>
            <PillarTooltip
              pillarKey={pillarKey}
              metrics={metrics}
              {...tooltip}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Group session insights into grammar, vocabulary, and structure buckets.
 */
function groupInsightsByCategory(insights: SessionDetail['insights']) {
  return {
    grammar: insights.filter((i) => i.category.toLowerCase() === 'grammar'),
    vocabulary: insights.filter((i) => i.category.toLowerCase() === 'vocabulary'),
    structure: insights.filter((i) => i.category.toLowerCase() === 'structure'),
  };
}

/** Derive vocabulary suggestions from vocabulary insights when explicit suggestions are unavailable. */
function deriveVocabSuggestions(insights: SessionDetail['insights']): VocabSuggestion[] {
  return insights
    .filter((i) => i.category.toLowerCase() === 'vocabulary')
    .slice(0, 3)
    .map((insight) => ({
      word: insight.pattern,
      meaning: insight.detail,
      exampleSentence:
        insight.suggestion ??
        insight.examples?.[0] ??
        `Try using "${insight.pattern}" in your next session.`,
    }));
}

interface CategoryInsightsSectionProps {
  title: string;
  insights: SessionDetail['insights'];
  baseDelay: number;
}

function CategoryInsightsSection({ title, insights, baseDelay }: CategoryInsightsSectionProps) {
  return (
    <CollapsibleSection title={title} count={insights.length}>
      {insights.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No issues detected</p>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              category={insight.category}
              pattern={insight.pattern}
              detail={insight.detail}
              frequency={insight.frequency}
              severity={insight.severity}
              examples={insight.examples}
              suggestion={insight.suggestion}
              animationDelay={baseDelay + index * 80}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<SessionSkeleton />}>
      <SessionContent params={params} />
    </Suspense>
  );
}

function SessionSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
        Loading session…
      </div>
    </div>
  );
}

function SessionContent({
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
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [resultsView, setResultsView] = useState<'overall' | 'segments'>('overall');
  const pitchState = usePitchContour(
    session !== null && session.status !== 'FAILED' ? id : '',
  );

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

  useEffect(() => {
    if (!isDone) return;
    void fetch('/api/users/me/vocabulary')
      .then(async (res) => {
        if (!res.ok) return;
        const json: unknown = await res.json();
        if (Array.isArray(json)) setVocabItems(json as VocabItem[]);
      })
      .catch(() => undefined);
  }, [isDone]);

  if (isLoading && !session) {
    return (
      <Container>
        <div
          className="flex flex-col items-center justify-center gap-3 py-20"
          aria-live="polite"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500 dark:border-slate-700" />
          <span className="sr-only">Loading workout</span>
        </div>
      </Container>
    );
  }

  if (isProcessing && session) {
    const partialData = buildPartialData(
      session,
      pitchState.status === 'ready',
    );
    const partialPronunciation = (() => {
      if (
        session.pronunciationReport === null ||
        session.pronunciationReport === undefined
      ) {
        return null;
      }
      const result = PronunciationReportSchema.safeParse(session.pronunciationReport);
      return result.success ? result.data : null;
    })();

    return (
      <Container>
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
          Processing Your Workout
        </h1>
        <ProcessingStatus
          status={session.status}
          onRetry={retry}
          partialData={partialData}
        />

        {session.transcript && (
          <div className="mt-8">
            <AnnotatedTranscript
              text={session.transcript.text}
              wordCount={session.transcript.wordCount}
              insights={session.insights}
              metrics={session.metrics ?? []}
              animationDelay={0}
            />
          </div>
        )}

        {partialPronunciation !== null && (
          <div className="mt-8 space-y-6">
            <PronunciationSection
              pronunciationReport={partialPronunciation}
              animationDelay={100}
            />
            <WordColorMap words={partialPronunciation.words} animationDelay={150} />
            <ProsodyFeedback
              words={partialPronunciation.words}
              prosodyScore={partialPronunciation.prosodyScore}
              animationDelay={200}
            />
          </div>
        )}

        {session.insights.length > 0 && (
          <div className="mt-8">
            <InsightsList insights={session.insights} baseDelay={250} />
          </div>
        )}

        {pitchState.status === 'ready' && (
          <div className="mt-8">
            <PitchContour contour={pitchState.contour} animationDelay={300} />
          </div>
        )}
      </Container>
    );
  }

  if (isFailed && session) {
    return (
      <Container>
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
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

    const hasChunkBreakdown =
      session.isChunked === true &&
      session.chunks !== undefined &&
      session.chunks.length > 0;

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

          {session.partialResults && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              Partial Results
            </span>
          )}

          {hasChunkBreakdown && (
            <div
              className="mt-4 flex justify-center gap-2"
              role="tablist"
              aria-label="Results view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={resultsView === 'overall'}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  resultsView === 'overall'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
                onClick={() => setResultsView('overall')}
              >
                Overall
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={resultsView === 'segments'}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  resultsView === 'segments'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
                onClick={() => setResultsView('segments')}
              >
                By Segment
              </button>
            </div>
          )}

          {hasChunkBreakdown && resultsView === 'segments' ? (
            <div className="mt-6">
              <ChunkBreakdown chunks={session.chunks ?? []} />
            </div>
          ) : (
            <>

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
            const grouped = groupInsightsByCategory(session.insights);
            const vocabSuggestions = deriveVocabSuggestions(session.insights);
            const languageInsightCount = session.insights.length;

            return (
              <CollapsibleSection
                title="Language Feedback"
                count={languageInsightCount}
                animationDelay={200}
              >
                <div className="flex flex-col gap-4">
                  <CategoryInsightsSection
                    title="Grammar"
                    insights={grouped.grammar}
                    baseDelay={220}
                  />
                  <CategoryInsightsSection
                    title="Vocabulary"
                    insights={grouped.vocabulary}
                    baseDelay={280}
                  />
                  <CategoryInsightsSection
                    title="Structure"
                    insights={grouped.structure}
                    baseDelay={340}
                  />
                  <VocabSuggestions suggestions={vocabSuggestions} animationDelay={400} />
                  <VocabProgress items={vocabItems} animationDelay={450} />
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
                      onStartDrill={() =>
                        void handleStartDrill(drillConfig.drillType, weakestSnapshot.key)
                      }
                    />
                  )}
                  {session.focusNext && (
                    <FocusNextBanner focusNext={session.focusNext} animationDelay={focusBannerDelay} />
                  )}
                </div>
              </CollapsibleSection>
            );
          })()}

          {pronunciationReport !== null && (
            <CollapsibleSection
              title="Pronunciation & Intonation"
              animationDelay={pronunciationSectionDelay}
            >
              <div className="space-y-4">
                <PronunciationSection
                  pronunciationReport={pronunciationReport}
                  animationDelay={pronunciationSectionDelay}
                  {...(pronunciationHistory.length >= 2
                    ? {
                        progressChip: {
                          metricLabel: 'Fluency',
                          deltaPercent: Math.round(
                            (pronunciationHistory[pronunciationHistory.length - 1]?.fluencyScore ??
                              0) -
                              (pronunciationHistory[pronunciationHistory.length - 2]?.fluencyScore ??
                                0),
                          ),
                        },
                      }
                    : {})}
                />
                <PhonemePatterns
                  phonemes={aggregatePhonemes(pronunciationReport.words)}
                  animationDelay={pronunciationSectionDelay + 50}
                />
                <CollapsibleSection title="Word Color Map" defaultOpen={false}>
                  <WordColorMap
                    words={pronunciationReport.words}
                    animationDelay={wordColorMapDelay}
                  />
                </CollapsibleSection>
                <CollapsibleSection title="Prosody Feedback" defaultOpen={false}>
                  <ProsodyFeedback
                    words={pronunciationReport.words}
                    prosodyScore={pronunciationReport.prosodyScore}
                    animationDelay={wordColorMapDelay + 50}
                  />
                </CollapsibleSection>
                <ProsodyPanel
                  words={pronunciationReport.words}
                  speakingRateWpm={pronunciationReport.speakingRateWpm}
                  prosodyScore={pronunciationReport.prosodyScore}
                  animationDelay={prosodyPanelDelay}
                />
                {pitchState.status === 'ready' && (
                  <CollapsibleSection title="Pitch Contour" defaultOpen={false}>
                    <PitchContour
                      contour={pitchState.contour}
                      animationDelay={pronunciationSectionDelay + 50}
                    />
                  </CollapsibleSection>
                )}
                <CollapsibleSection title="Pronunciation Tips" defaultOpen={false}>
                  <PronunciationTipsCard
                    pronunciationReport={pronunciationReport}
                    animationDelay={prosodyPanelDelay + 100}
                  />
                </CollapsibleSection>
                <CollapsibleSection title="Practice Suggestion" defaultOpen={false}>
                  <PracticeSuggestion
                    pronunciationReport={pronunciationReport}
                    animationDelay={prosodyPanelDelay + 200}
                  />
                </CollapsibleSection>
                <CollapsibleSection title="Pronunciation Progress" defaultOpen={false}>
                  <PronunciationProgress
                    currentSessionId={session.id}
                    history={pronunciationHistory}
                    animationDelay={prosodyPanelDelay + 300}
                  />
                </CollapsibleSection>
              </div>
            </CollapsibleSection>
          )}

          {session.transcript && (
            <CollapsibleSection title="Annotated Transcript" defaultOpen={false} animationDelay={transcriptDelay}>
              {session.transcript.improvedText && session.transcript.wordsUsed.length > 0 ? (
                <TranscriptToggle
                  originalText={session.transcript.text}
                  improvedText={session.transcript.improvedText}
                  wordsUsed={session.transcript.wordsUsed}
                  wordCount={session.transcript.wordCount}
                  animationDelay={transcriptDelay}
                />
              ) : (
                <AnnotatedTranscript
                  text={session.transcript.text}
                  wordCount={session.transcript.wordCount}
                  insights={session.insights}
                  metrics={session.metrics ?? []}
                  animationDelay={transcriptDelay}
                  embedded
                />
              )}
            </CollapsibleSection>
          )}
            </>
          )}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <p className="py-20 text-center text-slate-500 dark:text-slate-400">Workout not found.</p>
    </Container>
  );
}
