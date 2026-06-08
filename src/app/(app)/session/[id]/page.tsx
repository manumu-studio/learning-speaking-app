// Session results page — displays analysis feedback with staggered entrance animations
'use client';

import { use, Suspense } from 'react';
import { Container } from '@/components/ui/Container';
import { SessionDoneView } from './SessionDoneView';
import { SessionLoadingView, SessionProcessingView, SessionFailedView } from './SessionStateViews';
import { useSessionPageData } from './useSessionPageData';

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
  const {
    session,
    isLoading,
    isProcessing,
    isDone,
    isFailed,
    retry,
    personalRecords,
    focusComparison,
    pronunciationHistory,
    resultsView,
    setResultsView,
    pitchState,
  } = useSessionPageData(id);

  if (isLoading && !session) {
    return <SessionLoadingView />;
  }

  if (isProcessing && session) {
    return <SessionProcessingView session={session} pitchState={pitchState} onRetry={retry} />;
  }

  if (isFailed && session) {
    return <SessionFailedView session={session} onRetry={retry} />;
  }

  if (isDone && session) {
    return (
      <SessionDoneView
        session={session}
        personalRecords={personalRecords}
        focusComparison={focusComparison}
        pronunciationHistory={pronunciationHistory}
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
