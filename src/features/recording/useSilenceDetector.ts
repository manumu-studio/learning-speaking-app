// Hook that detects sustained silence during recording — 3 tiers: pause, warning beep, auto-stop
'use client';
/* eslint-disable max-lines-per-function */

import { useCallback, useEffect, useRef, useState } from 'react';

const SILENCE_THRESHOLD = 0.01;
const TIER_1_PAUSE_MS = 15_000;
const TIER_2_WARNING_MS = 30_000;
const TIER_3_AUTO_STOP_MS = 45_000;
const CHECK_INTERVAL_MS = 200;
const BEEP_FREQUENCY_HZ = 880;
const BEEP_DURATION_MS = 500;

export interface UseSilenceDetectorOptions {
  stream: MediaStream | null;
  isRecording: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onWarningBeep?: () => void;
  onAutoStop?: () => void;
}

export interface UseSilenceDetectorReturn {
  isPausedBySilence: boolean;
  silenceWarningActive: boolean;
  secondsUntilAutoStop: number | null;
}

function calculateRms(data: Float32Array): number {
  let sumSquares = 0;
  for (let index = 0; index < data.length; index += 1) {
    const sample = data[index] ?? 0;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / data.length);
}

function playWarningBeep(): void {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = BEEP_FREQUENCY_HZ;
    gain.gain.value = 0.3;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + BEEP_DURATION_MS / 1000);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Audio playback not available — silent fallback
  }
}

export function useSilenceDetector({
  stream,
  isRecording,
  onPause,
  onResume,
  onWarningBeep,
  onAutoStop,
}: UseSilenceDetectorOptions): UseSilenceDetectorReturn {
  const [isPausedBySilence, setIsPausedBySilence] = useState(false);
  const [silenceWarningActive, setSilenceWarningActive] = useState(false);
  const [secondsUntilAutoStop, setSecondsUntilAutoStop] = useState<number | null>(null);

  const isPausedRef = useRef(false);
  const warningFiredRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  const onWarningBeepRef = useRef(onWarningBeep);
  const onAutoStopRef = useRef(onAutoStop);

  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onResumeRef.current = onResume; }, [onResume]);
  useEffect(() => { onWarningBeepRef.current = onWarningBeep; }, [onWarningBeep]);
  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);

  const resetAllState = useCallback(() => {
    isPausedRef.current = false;
    warningFiredRef.current = false;
    silenceSinceRef.current = null;
    setIsPausedBySilence(false);
    setSilenceWarningActive(false);
    setSecondsUntilAutoStop(null);
  }, []);

  // Reset UI state when recording stops
  useEffect(() => {
    if (!isRecording || !stream) {
      isPausedRef.current = false;
      warningFiredRef.current = false;
      silenceSinceRef.current = null;
    }
  }, [isRecording, stream]);

  useEffect(() => {
    if (!isRecording || !stream) {
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

        // Tier 3: Auto-stop at 45s
        if (silenceDuration >= TIER_3_AUTO_STOP_MS) {
          onAutoStopRef.current?.();
          resetAllState();
          return;
        }

        // Tier 2: Warning beep at 30s + countdown
        if (silenceDuration >= TIER_2_WARNING_MS) {
          if (!warningFiredRef.current) {
            warningFiredRef.current = true;
            setSilenceWarningActive(true);
            playWarningBeep();
            onWarningBeepRef.current?.();
          }
          const remaining = Math.ceil((TIER_3_AUTO_STOP_MS - silenceDuration) / 1000);
          setSecondsUntilAutoStop(remaining);
          return;
        }

        // Tier 1: Auto-pause at 15s
        if (silenceDuration >= TIER_1_PAUSE_MS && !isPausedRef.current) {
          isPausedRef.current = true;
          setIsPausedBySilence(true);
          onPauseRef.current?.();
        }
        return;
      }

      // Speech detected — reset everything
      silenceSinceRef.current = null;

      if (isPausedRef.current || warningFiredRef.current) {
        const wasPaused = isPausedRef.current;
        isPausedRef.current = false;
        warningFiredRef.current = false;
        setIsPausedBySilence(false);
        setSilenceWarningActive(false);
        setSecondsUntilAutoStop(null);
        if (wasPaused) {
          onResumeRef.current?.();
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      source.disconnect();
      void audioContext.close();
      resetAllState();
    };
  }, [isRecording, stream, resetAllState]);

  return {
    isPausedBySilence: isRecording && stream ? isPausedBySilence : false,
    silenceWarningActive: isRecording && stream ? silenceWarningActive : false,
    secondsUntilAutoStop: isRecording && stream ? secondsUntilAutoStop : null,
  };
}
