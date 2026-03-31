// DrillView — orchestrates drill lifecycle: prompt → recording → processing → feedback
'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { DrillTimer } from '@/features/training/DrillTimer';
import { DrillPromptCard } from '@/features/training/DrillPromptCard';
import { DrillFeedback } from '@/features/training/DrillFeedback';
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

  const recorder = useAudioRecorder();
  const recorderRef = useRef(recorder);
  const stateRef = useRef(state);

  useLayoutEffect(() => {
    recorderRef.current = recorder;
  });

  useLayoutEffect(() => {
    stateRef.current = state;
  });

  const submissionSentRef = useRef(false);

  const handleRecordingTimerComplete = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    const r = recorderRef.current;
    if (r.state === 'recording') {
      r.stopRecording();
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
      recorderRef.current.resetRecording();
    }
  }, [state]);

  useEffect(() => {
    if (state === 'recording') {
      void recorderRef.current.startRecording();
    }
  }, [state]);

  useEffect(() => {
    if (state !== 'recording') {
      submissionSentRef.current = false;
      return;
    }
    const r = recorderRef.current;
    if (r.state === 'stopped' && r.audioBlob && !submissionSentRef.current) {
      submissionSentRef.current = true;
      void submitDrillWithAudio(r.audioBlob);
    }
  }, [state, recorder.state, recorder.audioBlob, submitDrillWithAudio]);

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
          <p className="text-center text-zinc-300">Recording… speak now.</p>
          {recorder.error ? (
            <p className="text-center text-sm text-amber-400">{recorder.error}</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const r = recorderRef.current;
              if (r.state === 'recording') {
                r.stopRecording();
              }
            }}
            className="w-full rounded-lg bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Stop Recording
          </button>
        </>
      )}

      {state === 'processing' && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-zinc-400">Analyzing your response...</p>
        </div>
      )}

      {state === 'feedback' && feedback && (
        <DrillFeedback
          feedback={feedback.feedback}
          improved={feedback.improved}
          onTryAgain={() => void handleTryAgain()}
          onBackToResults={handleBackToResults}
          onGoToDashboard={handleGoToDashboard}
        />
      )}
    </div>
  );
}
