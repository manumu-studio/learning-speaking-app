// DrillView — orchestrates drill lifecycle: prompt → recording → processing → feedback
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DrillTimer } from '@/features/training/DrillTimer';
import { DrillPromptCard } from '@/features/training/DrillPromptCard';
import { DrillFeedback } from '@/features/training/DrillFeedback';
import { MicroWin } from '@/features/training/MicroWin';
import type { DrillViewProps } from './DrillView.types';
import type { DrillData, DrillFeedbackData } from './useDrill';
import { useDrill } from './useDrill';
import { useDrillRecording } from './useDrillRecording';

const PROMPT_PREP_SECONDS = 10;

// ---------------------------------------------------------------------------
// Sub-view components
// ---------------------------------------------------------------------------

interface PromptViewProps {
  drill: DrillData;
  onStart: () => void;
}

function PromptView({ drill, onStart }: PromptViewProps) {
  return (
    <>
      <DrillPromptCard
        drillType={drill.drillType}
        prompt={drill.prompt}
        sourceExample={drill.sourceExample}
        timeLimit={drill.timeLimit}
      />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-zinc-400">Get ready</p>
        <DrillTimer
          key={`prep-${drill.id}-${PROMPT_PREP_SECONDS}`}
          mode="countdown"
          duration={PROMPT_PREP_SECONDS}
          isRunning
          onComplete={onStart}
        />
      </div>
      <button
        type="button"
        aria-label="Start recording"
        onClick={onStart}
        className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Start Recording
      </button>
    </>
  );
}

interface RecordingViewProps {
  drill: DrillData;
  workletError: string | null;
  onStop: () => void;
  onTimerComplete: () => void;
}

function RecordingView({ drill, workletError, onStop, onTimerComplete }: RecordingViewProps) {
  return (
    <>
      <DrillTimer
        key={`rec-${drill.id}-${drill.timeLimit}`}
        mode="countup"
        duration={drill.timeLimit}
        isRunning
        onComplete={onTimerComplete}
      />
      <p className="text-center text-zinc-300" aria-live="polite" role="status">
        Recording… speak now.
      </p>
      {workletError ? (
        <p className="text-center text-sm text-amber-400">{workletError}</p>
      ) : null}
      <button
        type="button"
        aria-label="Stop recording"
        onClick={onStop}
        className="w-full rounded-lg bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
      >
        Stop Recording
      </button>
    </>
  );
}

interface FeedbackViewProps {
  feedback: DrillFeedbackData;
  metricLabel: string;
  onTryAgain: () => void;
  onBackToResults: () => void;
  onGoToDashboard: () => void;
}

function FeedbackView({
  feedback,
  metricLabel,
  onTryAgain,
  onBackToResults,
  onGoToDashboard,
}: FeedbackViewProps) {
  return (
    <div className="space-y-4">
      <MicroWin improved={feedback.improved} metricLabel={metricLabel} />
      <DrillFeedback
        feedback={feedback.feedback}
        improved={feedback.improved}
        onTryAgain={onTryAgain}
        onBackToResults={onBackToResults}
        onGoToDashboard={onGoToDashboard}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DrillView({ drillId }: DrillViewProps) {
  const router = useRouter();
  const { state, drill, feedback, error, isLoading, startRecording, stopRecording, tryAgain } =
    useDrill(drillId);

  const { workletError, onTimerComplete, onStopRecording } = useDrillRecording(
    state,
    stopRecording,
  );

  const handleTryAgain = useCallback(async () => {
    const newId = await tryAgain();
    if (newId) router.replace(`/drill/${newId}`);
  }, [tryAgain, router]);

  const handleBackToResults = useCallback(() => { router.back(); }, [router]);
  const handleGoToDashboard = useCallback(() => { router.push('/dashboard'); }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-zinc-400">Loading drill...</p>
      </div>
    );
  }

  if (error && !drill) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-amber-400">{error}</p>
      </div>
    );
  }

  if (!drill) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {error && drill ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {error}
        </p>
      ) : null}

      {state === 'prompt' && <PromptView drill={drill} onStart={startRecording} />}

      {state === 'recording' && (
        <RecordingView
          drill={drill}
          workletError={workletError}
          onStop={onStopRecording}
          onTimerComplete={onTimerComplete}
        />
      )}

      {state === 'processing' && (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center gap-4"
          aria-live="polite"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-zinc-400">Analyzing your response...</p>
        </div>
      )}

      {state === 'feedback' && feedback && (
        <FeedbackView
          feedback={feedback}
          metricLabel={drill.metricLabel}
          onTryAgain={() => void handleTryAgain()}
          onBackToResults={handleBackToResults}
          onGoToDashboard={handleGoToDashboard}
        />
      )}
    </div>
  );
}
