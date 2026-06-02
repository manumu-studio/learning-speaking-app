// Session results page — displays analysis feedback with staggered entrance animations
'use client';
/* eslint-disable complexity, max-lines-per-function */

import { use, useEffect, useState, Suspense } from 'react';
import { Container } from '@/components/ui/Container';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { usePersonalRecordBanner } from '@/components/ui/PersonalRecordBanner';
import {
  PronunciationReportSchema,
} from '@/components/ui/PronunciationSection';
import { PronunciationHistorySchema } from '@/components/ui/PronunciationProgress';
import type { HistoryItem } from '@/components/ui/PronunciationProgress';
import type { VocabItem } from '@/components/ui/VocabProgress';
import { AnnotatedTranscript } from '@/components/ui/AnnotatedTranscript';
import { PronunciationSection } from '@/components/ui/PronunciationSection';
import { WordColorMap } from '@/components/ui/WordColorMap';
import { ProsodyFeedback } from '@/components/ui/ProsodyFeedback';
import { InsightsList } from '@/components/ui/InsightsList';
import { PitchContour, usePitchContour } from '@/components/ui/PitchContour';
import { METRIC_LABELS } from '@/features/dashboard/pillars';
import { useSessionStatus } from '@/features/session/useSessionStatus';
import { SessionDoneView } from './SessionDoneView';
import type { FocusComparison } from './sessionResults.helpers';
import { buildPartialData, focusComparisonSchema } from './sessionResults.helpers';

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
        if (Array.isArray(json)) setVocabItems(json.filter((item): item is VocabItem =>
          typeof item === 'object' && item !== null && 'word' in item && 'meaning' in item,
        ));
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
    const partialData = buildPartialData(session, pitchState.status === 'ready');
    const partialPronunciation = (() => {
      if (session.pronunciationReport === null || session.pronunciationReport === undefined) {
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
        <ProcessingStatus status={session.status} onRetry={retry} partialData={partialData} />

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
            <PronunciationSection pronunciationReport={partialPronunciation} animationDelay={100} />
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
        <ProcessingStatus status="FAILED" errorMessage={session.errorMessage} onRetry={retry} />
      </Container>
    );
  }

  if (isDone && session) {
    return (
      <SessionDoneView
        session={session}
        personalRecords={personalRecords}
        focusComparison={focusComparison}
        pronunciationHistory={pronunciationHistory}
        vocabItems={vocabItems}
        pitchState={pitchState}
        resultsView={resultsView}
        setResultsView={setResultsView}
      />
    );
  }

  return (
    <Container>
      <p className="py-20 text-center text-slate-500 dark:text-slate-400">Workout not found.</p>
    </Container>
  );
}
