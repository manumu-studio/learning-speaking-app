// Session results page — displays analysis feedback with staggered entrance animations
'use client';

import { use } from 'react';
import { Container } from '@/components/ui/Container';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { SessionHeader } from '@/components/ui/SessionHeader';
import { InsightsList } from '@/components/ui/InsightsList';
import { FocusNextBanner } from '@/components/ui/FocusNextBanner';
import { TranscriptSection } from '@/components/ui/TranscriptSection';
import { FocusHighlight } from '@/features/session/FocusHighlight';
import { useSessionStatus } from '@/features/session/useSessionStatus';
import styles from './SessionResults.module.css';

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session, isLoading, isProcessing, isDone, isFailed, retry } = useSessionStatus(id);

  // Loading state
  if (isLoading && !session) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500" />
        </div>
      </Container>
    );
  }

  // Processing state
  if (isProcessing && session) {
    return (
      <Container>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
          Processing Your Session
        </h1>
        <ProcessingStatus
          status={session.status as 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'DONE' | 'FAILED'}
          onRetry={retry}
        />
      </Container>
    );
  }

  // Failed state
  if (isFailed && session) {
    return (
      <Container>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
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

  // Done state — render full results layout
  if (isDone && session) {
    // Calculate animation delays
    let currentDelay = 200 + session.insights.length * 100;
    
    // Focus highlight appears after insights if present
    const focusHighlightDelay = session.focusMetricKey ? currentDelay + 100 : 0;
    if (session.focusMetricKey) currentDelay += 200;
    
    // Focus next banner
    const focusBannerDelay = currentDelay + 100;
    currentDelay += 200;
    
    // Transcript
    const transcriptDelay = currentDelay + 100;

    // Get focus metric data if available
    const focusMetric = session.focusMetricKey && session.metrics
      ? session.metrics.find((m) => m.key === session.focusMetricKey)
      : null;
    
    const focusLabel = session.focusMetricKey
      ? METRIC_LABELS[session.focusMetricKey] ?? session.focusMetricKey
      : null;

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

          <InsightsList
            insights={session.insights}
            baseDelay={200}
          />

          {focusMetric && focusLabel && (
            <FocusHighlight
              metricLabel={focusLabel}
              currentScore={focusMetric.score}
              previousScore={null}
              animationDelay={focusHighlightDelay}
            />
          )}

          {session.focusNext && (
            <FocusNextBanner
              focusNext={session.focusNext}
              animationDelay={focusBannerDelay}
            />
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

  // Fallback
  return (
    <Container>
      <p className="text-gray-500 dark:text-gray-400 text-center py-20">Session not found.</p>
    </Container>
  );
}
