// useDrillRecording — wires AudioWorklet lifecycle to the drill state machine
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';

type DrillState = 'prompt' | 'recording' | 'processing' | 'feedback';

export interface UseDrillRecordingReturn {
  workletError: string | null;
  onTimerComplete: () => void;
  onStopRecording: () => void;
}

export function useDrillRecording(
  state: DrillState,
  submitDrillWithAudio: (blob: Blob) => Promise<void>,
): UseDrillRecordingReturn {
  const finalBlobRef = useRef<Blob | null>(null);
  const submissionSentRef = useRef(false);

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

  useEffect(() => { workletRef.current = worklet; });
  useEffect(() => { stateRef.current = state; });

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

  const onTimerComplete = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    const recorder = workletRef.current;
    if (recorder.state === 'recording') {
      void recorder.stopRecording();
    }
  }, []);

  const onStopRecording = useCallback(() => {
    const recorder = workletRef.current;
    if (recorder.state === 'recording') {
      void recorder.stopRecording();
    }
  }, []);

  return {
    workletError: worklet.error ?? null,
    onTimerComplete,
    onStopRecording,
  };
}
