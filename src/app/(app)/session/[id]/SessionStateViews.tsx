// Intermediate session state views — loading spinner, processing progress, and failure message
'use client';

import { Container } from '@/components/ui/Container';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { AnnotatedTranscript } from '@/components/ui/AnnotatedTranscript';
import { PronunciationSection, PronunciationReportSchema } from '@/components/ui/PronunciationSection';
import { WordColorMap } from '@/components/ui/WordColorMap';
import { ProsodyFeedback } from '@/components/ui/ProsodyFeedback';
import { InsightsList } from '@/components/ui/InsightsList';
import { PitchContour } from '@/components/ui/PitchContour';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';
import type { PitchContourState } from '@/components/ui/PitchContour';
import { buildPartialData } from './sessionResults.helpers';

export function SessionLoadingView() {
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

interface SessionProcessingViewProps {
  session: SessionDetail;
  pitchState: PitchContourState;
  onRetry: () => void;
}

function PronunciationBlock({
  session,
  pitchReady,
}: {
  session: SessionDetail;
  pitchReady: boolean;
}) {
  if (session.pronunciationReport === null || session.pronunciationReport === undefined) {
    return null;
  }
  const result = PronunciationReportSchema.safeParse(session.pronunciationReport);
  if (!result.success) return null;
  const report = result.data;
  return (
    <div className="mt-8 space-y-6">
      <PronunciationSection pronunciationReport={report} animationDelay={100} />
      <WordColorMap words={report.words} animationDelay={150} />
      <ProsodyFeedback
        words={report.words}
        prosodyScore={report.prosodyScore}
        animationDelay={200}
      />
      {pitchReady && <span />}
    </div>
  );
}

export function SessionProcessingView({
  session,
  pitchState,
  onRetry,
}: SessionProcessingViewProps) {
  const partialData = buildPartialData(session, pitchState.status === 'ready');

  return (
    <Container>
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
        Processing Your Workout
      </h1>
      <ProcessingStatus status={session.status} onRetry={onRetry} partialData={partialData} />

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

      <PronunciationBlock session={session} pitchReady={pitchState.status === 'ready'} />

      {session.insights.length > 0 && (
        <div className="mt-8">
          <InsightsList insights={session.insights} baseDelay={250} />
        </div>
      )}

      {pitchState.status === 'ready' && 'contour' in pitchState && (
        <div className="mt-8">
          <PitchContour contour={pitchState.contour} animationDelay={300} />
        </div>
      )}
    </Container>
  );
}

interface SessionFailedViewProps {
  session: SessionDetail;
  onRetry: () => void;
}

export function SessionFailedView({ session, onRetry }: SessionFailedViewProps) {
  return (
    <Container>
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
        Workout Results
      </h1>
      <ProcessingStatus status="FAILED" errorMessage={session.errorMessage} onRetry={onRetry} />
    </Container>
  );
}
