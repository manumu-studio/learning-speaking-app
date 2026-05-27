// Drives real-time waveform bars using Web Audio API AnalyserNode
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  UseWaveformVisualizerOptions,
  UseWaveformVisualizerReturn,
} from './WaveformVisualizer.types';

const DEFAULT_BAR_COUNT = 24;

function createZeroHeights(count: number): readonly number[] {
  return Array.from({ length: count }, () => 0);
}

function downsampleFrequencies(
  data: Uint8Array,
  barCount: number,
): readonly number[] {
  const binCount = data.length;
  const binsPerBar = Math.max(1, Math.floor(binCount / barCount));
  const heights: number[] = [];

  for (let i = 0; i < barCount; i += 1) {
    const start = i * binsPerBar;
    const end = Math.min(start + binsPerBar, binCount);
    let sum = 0;
    for (let j = start; j < end; j += 1) {
      sum += data[j] ?? 0;
    }
    const avg = sum / (end - start);
    heights.push(avg / 255);
  }

  return heights;
}

export function useWaveformVisualizer({
  stream,
  barCount = DEFAULT_BAR_COUNT,
}: UseWaveformVisualizerOptions): UseWaveformVisualizerReturn {
  const idleHeights = useMemo(() => createZeroHeights(barCount), [barCount]);
  const [liveHeights, setLiveHeights] = useState<readonly number[]>(idleHeights);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const canUseWebAudio =
    typeof window !== 'undefined' && typeof AudioContext !== 'undefined';
  const isActive = canUseWebAudio && stream !== null;

  useEffect(() => {
    if (!isActive || !stream) {
      return undefined;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const tick = () => {
      const activeAnalyser = analyserRef.current;
      if (!activeAnalyser) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const buffer = new Uint8Array(activeAnalyser.frequencyBinCount);
      activeAnalyser.getByteFrequencyData(buffer);
      setLiveHeights(downsampleFrequencies(buffer, barCount));
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      sourceRef.current?.disconnect();
      sourceRef.current = null;
      analyserRef.current?.disconnect();
      analyserRef.current = null;

      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx && ctx.state !== 'closed') {
        void ctx.close();
      }
    };
  }, [stream, barCount, isActive]);

  return { barHeights: isActive ? liveHeights : idleHeights };
}
