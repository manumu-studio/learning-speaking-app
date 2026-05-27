// Hook that detects sustained silence during recording and signals pause/resume
'use client';

import { useEffect, useRef, useState } from 'react';

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 15_000;
const CHECK_INTERVAL_MS = 200;

export interface UseSilenceDetectorOptions {
  stream: MediaStream | null;
  isRecording: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export interface UseSilenceDetectorReturn {
  isPausedBySilence: boolean;
}

function calculateRms(data: Float32Array): number {
  let sumSquares = 0;
  for (let index = 0; index < data.length; index += 1) {
    const sample = data[index] ?? 0;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / data.length);
}

export function useSilenceDetector({
  stream,
  isRecording,
  onPause,
  onResume,
}: UseSilenceDetectorOptions): UseSilenceDetectorReturn {
  const [isPausedBySilence, setIsPausedBySilence] = useState(false);
  const isPausedRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);

  useEffect(() => {
    onPauseRef.current = onPause;
  }, [onPause]);

  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  useEffect(() => {
    if (!isRecording || !stream) {
      isPausedRef.current = false;
      silenceSinceRef.current = null;
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);

    const interval = setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      const rms = calculateRms(buffer);

      if (rms < SILENCE_THRESHOLD) {
        if (silenceSinceRef.current === null) {
          silenceSinceRef.current = Date.now();
        }

        const silenceDuration = Date.now() - silenceSinceRef.current;
        if (silenceDuration >= SILENCE_DURATION_MS && !isPausedRef.current) {
          isPausedRef.current = true;
          setIsPausedBySilence(true);
          onPauseRef.current?.();
        }
        return;
      }

      silenceSinceRef.current = null;

      if (isPausedRef.current) {
        isPausedRef.current = false;
        setIsPausedBySilence(false);
        onResumeRef.current?.();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      source.disconnect();
      void audioContext.close();
      isPausedRef.current = false;
      silenceSinceRef.current = null;
      setIsPausedBySilence(false);
    };
  }, [isRecording, stream]);

  return {
    isPausedBySilence: isRecording && stream ? isPausedBySilence : false,
  };
}
