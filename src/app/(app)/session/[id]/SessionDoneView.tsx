// Session results "done" view — orchestrates language feedback, pronunciation, transcript sections
'use client';

import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SessionHeader } from '@/components/ui/SessionHeader';
import { PersonalRecordBanner } from '@/components/ui/PersonalRecordBanner';
import { ChunkBreakdown } from '@/components/ui/ChunkBreakdown';
import type { PitchContourState } from '@/components/ui/PitchContour';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';
import type { PersonalRecord } from '@/lib/personalRecords.types';
import styles from './SessionResults.module.css';
import { PillarHeroRow } from './PillarHeroRow';
import { LanguageFeedbackSection, PronunciationFeedbackSection, TranscriptOnlySection } from './SessionFeedbackSections';
import type { FocusComparison } from './sessionResults.helpers';
import { useSessionDoneViewModel } from './useSessionDoneViewModel';

interface SessionDoneViewProps {
  session: SessionDetail;
  personalRecords: PersonalRecord[];
  focusComparison: FocusComparison | null;
  pronunciationHistory: HistoryItem[];
  pitchState: PitchContourState;
  resultsView: 'overall' | 'segments';
  setResultsView: (view: 'overall' | 'segments') => void;
}

export function SessionDoneView({
  session,
  personalRecords,
  focusComparison,
  pronunciationHistory,
  pitchState,
  resultsView,
  setResultsView,
}: SessionDoneViewProps) {
  const { pronunciationReport, delays, hasChunkBreakdown } = useSessionDoneViewModel(
    session,
    focusComparison,
  );

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
          <SessionOverallView
            session={session}
            personalRecords={personalRecords}
            pronunciationHistory={pronunciationHistory}
            pitchState={pitchState}
            pronunciationReport={pronunciationReport}
            delays={delays}
          />
        )}
      </div>
    </Container>
  );
}

import type { AnimationDelays } from './useSessionDoneViewModel';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';

interface SessionOverallViewProps {
  session: SessionDetail;
  personalRecords: PersonalRecord[];
  pronunciationHistory: HistoryItem[];
  pitchState: PitchContourState;
  pronunciationReport: PronunciationReport | null;
  delays: AnimationDelays;
}

function SessionOverallView({
  session,
  personalRecords,
  pronunciationHistory,
  pitchState,
  pronunciationReport,
  delays,
}: SessionOverallViewProps) {
  return (
    <>
      {personalRecords.length > 0 && (
        <PersonalRecordBanner personalRecords={personalRecords} animationDelay={100} />
      )}

      {session.metrics && session.metrics.length > 0 && (
        <PillarHeroRow metrics={session.metrics} />
      )}

      <LanguageFeedbackSection session={session} />

      {pronunciationReport !== null ? (
        <PronunciationFeedbackSection
          session={session}
          pronunciationReport={pronunciationReport}
          pronunciationHistory={pronunciationHistory}
          pitchState={pitchState}
          pronunciationSectionDelay={delays.pronunciationSectionDelay}
          prosodyPanelDelay={delays.prosodyPanelDelay}
        />
      ) : session.transcript ? (
        <TranscriptOnlySection session={session} transcriptDelay={delays.transcriptDelay} />
      ) : null}

      <div className="mt-6 text-center">
        <Link
          href={`/logs/session/${session.id}`}
          className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          View evidence →
        </Link>
      </div>
    </>
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
