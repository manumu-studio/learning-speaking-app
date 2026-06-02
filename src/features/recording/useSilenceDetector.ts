// Hook that detects sustained silence during recording — 3 tiers: pause, warning beep, auto-stop
'use client';

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

function calculateRms(data: Float32Array<ArrayBuffer>): number {
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

interface SilenceTickRefs {
  isPausedRef: React.MutableRefObject<boolean>;
  warningFiredRef: React.MutableRefObject<boolean>;
  silenceSinceRef: React.MutableRefObject<number | null>;
  onPauseRef: React.MutableRefObject<(() => void) | undefined>;
  onResumeRef: React.MutableRefObject<(() => void) | undefined>;
  onWarningBeepRef: React.MutableRefObject<(() => void) | undefined>;
  onAutoStopRef: React.MutableRefObject<(() => void) | undefined>;
}

interface SilenceTickSetters {
  setIsPausedBySilence: (v: boolean) => void;
  setSilenceWarningActive: (v: boolean) => void;
  setSecondsUntilAutoStop: (v: number | null) => void;
  resetAllState: () => void;
}

function handleSilenceActive(
  silenceDuration: number,
  refs: SilenceTickRefs,
  setters: SilenceTickSetters,
): void {
  if (silenceDuration >= TIER_3_AUTO_STOP_MS) {
    refs.onAutoStopRef.current?.();
    setters.resetAllState();
    return;
  }

  if (silenceDuration >= TIER_2_WARNING_MS) {
    if (!refs.warningFiredRef.current) {
      refs.warningFiredRef.current = true;
      setters.setSilenceWarningActive(true);
      playWarningBeep();
      refs.onWarningBeepRef.current?.();
    }
    const remaining = Math.ceil((TIER_3_AUTO_STOP_MS - silenceDuration) / 1000);
    setters.setSecondsUntilAutoStop(remaining);
    return;
  }

  if (silenceDuration >= TIER_1_PAUSE_MS && !refs.isPausedRef.current) {
    refs.isPausedRef.current = true;
    setters.setIsPausedBySilence(true);
    refs.onPauseRef.current?.();
  }
}

function handleSpeechDetected(refs: SilenceTickRefs, setters: SilenceTickSetters): void {
  refs.silenceSinceRef.current = null;

  if (refs.isPausedRef.current || refs.warningFiredRef.current) {
    const wasPaused = refs.isPausedRef.current;
    refs.isPausedRef.current = false;
    refs.warningFiredRef.current = false;
    setters.setIsPausedBySilence(false);
    setters.setSilenceWarningActive(false);
    setters.setSecondsUntilAutoStop(null);
    if (wasPaused) {
      refs.onResumeRef.current?.();
    }
  }
}

function buildSilenceTickHandler(
  analyser: AnalyserNode,
  buffer: Float32Array<ArrayBuffer>,
  refs: SilenceTickRefs,
  setters: SilenceTickSetters,
): () => void {
  return () => {
    analyser.getFloatTimeDomainData(buffer);
    const rms = calculateRms(buffer);

    if (rms < SILENCE_THRESHOLD) {
      if (refs.silenceSinceRef.current === null) {
        refs.silenceSinceRef.current = Date.now();
      }
      const silenceDuration = Date.now() - refs.silenceSinceRef.current;
      handleSilenceActive(silenceDuration, refs, setters);
      return;
    }

    handleSpeechDetected(refs, setters);
  };
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

    const refs: SilenceTickRefs = {
      isPausedRef,
      warningFiredRef,
      silenceSinceRef,
      onPauseRef,
      onResumeRef,
      onWarningBeepRef,
      onAutoStopRef,
    };

    const setters: SilenceTickSetters = {
      setIsPausedBySilence,
      setSilenceWarningActive,
      setSecondsUntilAutoStop,
      resetAllState,
    };

    const tick = buildSilenceTickHandler(analyser, buffer, refs, setters);
    const interval = setInterval(tick, CHECK_INTERVAL_MS);

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
