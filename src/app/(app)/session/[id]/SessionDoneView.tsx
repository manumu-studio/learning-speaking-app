// Session results "done" view — orchestrates language feedback, pronunciation, transcript sections
'use client';

import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { SessionHeader } from '@/components/ui/SessionHeader';
import { PersonalRecordBanner } from '@/components/ui/PersonalRecordBanner';
import { METRIC_LABELS } from '@/features/dashboard/pillars';
import { PronunciationReportSchema } from '@/components/ui/PronunciationSection';
import type { PitchContourState } from '@/components/ui/PitchContour';
import type { VocabItem } from '@/components/ui/VocabProgress';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import { ChunkBreakdown } from '@/components/ui/ChunkBreakdown';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';
import type { DrillType } from '@/features/training/training.types';
import type { PersonalRecord } from '@/lib/personalRecords.types';
import styles from './SessionResults.module.css';
import { PillarHeroRow } from './PillarHeroRow';
import { LanguageFeedbackSection, PronunciationFeedbackSection, TranscriptSection } from './SessionFeedbackSections';
import type { FocusComparison } from './sessionResults.helpers';
import {
  METRIC_DRILL_MAP,
  pickWeakestMetric,
  collectRecentExamplesForDrill,
  focusPatternForDrill,
  drillCreatedSchema,
} from './sessionResults.helpers';

interface SessionDoneViewProps {
  session: SessionDetail;
  personalRecords: PersonalRecord[];
  focusComparison: FocusComparison | null;
  pronunciationHistory: HistoryItem[];
  vocabItems: VocabItem[];
  pitchState: PitchContourState;
  resultsView: 'overall' | 'segments';
  setResultsView: (view: 'overall' | 'segments') => void;
}

export function SessionDoneView({
  session,
  personalRecords,
  focusComparison,
  pronunciationHistory,
  vocabItems,
  pitchState,
  resultsView,
  setResultsView,
}: SessionDoneViewProps) {
  const router = useRouter();

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
          <ViewToggle resultsView={resultsView} setResultsView={setResultsView} />
        )}

        {hasChunkBreakdown && resultsView === 'segments' ? (
          <div className="mt-6">
            <ChunkBreakdown chunks={session.chunks ?? []} />
          </div>
        ) : (
          <>
            {personalRecords.length > 0 && (
              <PersonalRecordBanner personalRecords={personalRecords} animationDelay={100} />
            )}

            {session.metrics && session.metrics.length > 0 && (
              <PillarHeroRow metrics={session.metrics} />
            )}

            <LanguageFeedbackSection
              session={session}
              vocabItems={vocabItems}
              focusComparison={focusComparison}
              focusHighlightDelay={focusHighlightDelay}
              focusBannerDelay={focusBannerDelay}
              weakestSnapshot={weakestSnapshot}
              drillConfig={drillConfig}
              weakestLabel={weakestLabel}
              onStartDrill={handleStartDrill}
            />

            {pronunciationReport !== null && (
              <PronunciationFeedbackSection
                session={session}
                pronunciationReport={pronunciationReport}
                pronunciationHistory={pronunciationHistory}
                pitchState={pitchState}
                pronunciationSectionDelay={pronunciationSectionDelay}
                wordColorMapDelay={wordColorMapDelay}
                prosodyPanelDelay={prosodyPanelDelay}
              />
            )}

            {session.transcript && (
              <TranscriptSection session={session} transcriptDelay={transcriptDelay} />
            )}
          </>
        )}
      </div>
    </Container>
  );
}

function ViewToggle({
  resultsView,
  setResultsView,
}: {
  resultsView: 'overall' | 'segments';
  setResultsView: (view: 'overall' | 'segments') => void;
}) {
  return (
    <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Results view">
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
  );
}
