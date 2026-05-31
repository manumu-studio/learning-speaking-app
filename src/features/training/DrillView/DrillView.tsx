// DrillView — orchestrates drill lifecycle: prompt → recording → processing → feedback
'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import { DrillTimer } from '@/features/training/DrillTimer';
import { DrillPromptCard } from '@/features/training/DrillPromptCard';
import { DrillFeedback } from '@/features/training/DrillFeedback';
import { MicroWin } from '@/features/training/MicroWin';
import type { DrillViewProps } from './DrillView.types';
import { useDrill } from './useDrill';

const PROMPT_PREP_SECONDS = 10;

export function DrillView({ drillId }: DrillViewProps) {
  const router = useRouter();
  const {
    state,
    drill,
    feedback,
    error,
    isLoading,
    startRecording,
    stopRecording: submitDrillWithAudio,
    tryAgain,
  } = useDrill(drillId);

  const finalBlobRef = useRef<Blob | null>(null);

  const worklet = useAudioWorklet({
    onChunkReady: (event) => {
      if (event.isFinal) {
        finalBlobRef.current = event.wavBlob;
      }
    },
    chunkDurationSecs: 300,
  });

  const workletRef = useRef(worklet);
  const stateRef = useRef(state);

  useEffect(() => {
    workletRef.current = worklet;
  });

  useEffect(() => {
    stateRef.current = state;
  });

  const submissionSentRef = useRef(false);

  const handleRecordingTimerComplete = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    const recorder = workletRef.current;
    if (recorder.state === 'recording') {
      void recorder.stopRecording();
    }
  }, []);

  const handleTryAgain = useCallback(async () => {
    const newId = await tryAgain();
    if (newId) {
      router.replace(`/drill/${newId}`);
    }
  }, [tryAgain, router]);

  const handleBackToResults = useCallback(() => {
    router.back();
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    if (state === 'prompt') {
      finalBlobRef.current = null;
      workletRef.current.resetRecording();
    }
  }, [state]);

  useEffect(() => {
    if (state === 'recording') {
      finalBlobRef.current = null;
      void workletRef.current.startRecording();
    }
  }, [state]);

  useEffect(() => {
    if (state !== 'recording') {
      submissionSentRef.current = false;
      return;
    }
    const recorder = workletRef.current;
    if (recorder.state === 'stopped' && finalBlobRef.current && !submissionSentRef.current) {
      submissionSentRef.current = true;
      void submitDrillWithAudio(finalBlobRef.current);
    }
  }, [state, worklet.state, submitDrillWithAudio]);

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

      {state === 'prompt' && (
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
              onComplete={startRecording}
            />
          </div>
          <button
            type="button"
            aria-label="Start recording"
            onClick={startRecording}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Start Recording
          </button>
        </>
      )}

      {state === 'recording' && (
        <>
          <DrillTimer
            key={`rec-${drill.id}-${drill.timeLimit}`}
            mode="countup"
            duration={drill.timeLimit}
            isRunning
            onComplete={handleRecordingTimerComplete}
          />
          <p className="text-center text-zinc-300" aria-live="polite" role="status">
            Recording… speak now.
          </p>
          {worklet.error ? (
            <p className="text-center text-sm text-amber-400">{worklet.error}</p>
          ) : null}
          <button
            type="button"
            aria-label="Stop recording"
            onClick={() => {
              const recorder = workletRef.current;
              if (recorder.state === 'recording') {
                void recorder.stopRecording();
              }
            }}
            className="w-full rounded-lg bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Stop Recording
          </button>
        </>
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
        <div className="space-y-4">
          <MicroWin improved={feedback.improved} metricLabel={drill.metricLabel} />
          <DrillFeedback
            feedback={feedback.feedback}
            improved={feedback.improved}
            onTryAgain={() => void handleTryAgain()}
            onBackToResults={handleBackToResults}
            onGoToDashboard={handleGoToDashboard}
          />
        </div>
      )}
    </div>
  );
}
