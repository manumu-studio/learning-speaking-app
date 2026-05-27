// Silero VAD pre-flight hook — lazy-loads ONNX model and analyzes recorded blobs
'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  UseSileroVadReturn,
  VadPreflightResult,
  VadStatus,
} from './useSileroVad.types';

const VAD_MODEL_URL = '/vad/silero_vad_legacy.onnx';

export const VAD_THRESHOLDS = {
  minSpeechMs: 400,
  multiVoiceMinSegments: 3,
  multiVoiceGapMs: 800,
  multiVoiceSpeechRatio: 0.6,
} as const;

interface SpeechSegment {
  start: number;
  end: number;
}

type NonRealTimeVADInstance = {
  run: (
    inputAudio: Float32Array,
    sampleRate: number,
  ) => AsyncGenerator<{ start: number; end: number }>;
};

type VadModule = {
  NonRealTimeVAD: {
    new: (options?: { modelURL?: string }) => Promise<NonRealTimeVADInstance>;
  };
  utils: {
    audioFileToArray: (blob: Blob) => Promise<{ audio: Float32Array; sampleRate: number }>;
  };
};

function analyzeSegments(
  segments: SpeechSegment[],
  totalDurationMs: number,
): VadPreflightResult {
  if (segments.length === 0) {
    return {
      outcome: 'no-speech',
      message: 'No speech detected — go again and speak clearly into the microphone.',
    };
  }

  const totalSpeechMs = segments.reduce(
    (sum, segment) => sum + (segment.end - segment.start),
    0,
  );

  if (totalSpeechMs < VAD_THRESHOLDS.minSpeechMs) {
    return {
      outcome: 'no-speech',
      message: 'No speech detected — go again and speak clearly into the microphone.',
    };
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (previous && current && current.start - previous.end >= VAD_THRESHOLDS.multiVoiceGapMs) {
      gapCount += 1;
    }
  }

  const fragmented =
    sorted.length >= VAD_THRESHOLDS.multiVoiceMinSegments ||
    (sorted.length >= 2 && gapCount >= 1 && totalSpeechMs / totalDurationMs < VAD_THRESHOLDS.multiVoiceSpeechRatio);

  if (fragmented) {
    return {
      outcome: 'multi-voice',
      message:
        'Background voices detected — find a quieter spot or proceed anyway.',
      canProceed: true,
    };
  }

  return { outcome: 'speech-detected' };
}

export function useSileroVad(): UseSileroVadReturn {
  const [status, setStatus] = useState<VadStatus>('idle');
  const vadRef = useRef<NonRealTimeVADInstance | null>(null);
  const loadPromiseRef = useRef<Promise<NonRealTimeVADInstance> | null>(null);

  const loadVad = useCallback(async (): Promise<NonRealTimeVADInstance> => {
    if (vadRef.current) return vadRef.current;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    setStatus('loading');
    loadPromiseRef.current = (async () => {
      const vadModule = (await import('@ricky0123/vad-web')) as VadModule;
      const instance = await vadModule.NonRealTimeVAD.new({ modelURL: VAD_MODEL_URL });
      vadRef.current = instance;
      return instance;
    })();

    return loadPromiseRef.current;
  }, []);

  const analyzeBlob = useCallback(
    async (blob: Blob): Promise<VadPreflightResult> => {
      try {
        const vad = await loadVad();
        setStatus('running');

        const vadModule = (await import('@ricky0123/vad-web')) as VadModule;
        const { audio, sampleRate } = await vadModule.utils.audioFileToArray(blob);
        const segments: SpeechSegment[] = [];

        for await (const segment of vad.run(audio, sampleRate)) {
          segments.push({
            start: segment.start * 1000,
            end: segment.end * 1000,
          });
        }

        const totalDurationMs = (audio.length / sampleRate) * 1000;
        const result = analyzeSegments(segments, totalDurationMs);
        setStatus('done');
        return result;
      } catch {
        setStatus('done');
        return {
          outcome: 'error',
          message: 'Speech check failed — you can still upload if the recording sounds correct.',
        };
      }
    },
    [loadVad],
  );

  const reset = useCallback(() => {
    setStatus('idle');
  }, []);

  return { status, analyzeBlob, reset };
}
