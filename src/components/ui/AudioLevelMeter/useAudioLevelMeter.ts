// Hook for real-time mic amplitude via Web Audio AnalyserNode
'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  LevelWarning,
  UseAudioLevelMeterOptions,
  UseAudioLevelMeterReturn,
} from './AudioLevelMeter.types';

const CLIP_THRESHOLD = 0.92;
const QUIET_THRESHOLD = 0.04;
const QUIET_HOLD_MS = 1500;

function computeRms(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const normalized = ((data[i] ?? 128) - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / data.length);
}

export function useAudioLevelMeter({
  stream,
  isActive,
}: UseAudioLevelMeterOptions): UseAudioLevelMeterReturn {
  const [level, setLevel] = useState(0);
  const [warning, setWarning] = useState<LevelWarning>(null);
  const quietSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !stream) {
      quietSinceRef.current = null;
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    let frameId = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      const rms = computeRms(data);
      setLevel(rms);

      if (rms >= CLIP_THRESHOLD) {
        setWarning('clipping');
        quietSinceRef.current = null;
      } else if (rms <= QUIET_THRESHOLD) {
        const now = performance.now();
        if (quietSinceRef.current === null) {
          quietSinceRef.current = now;
        } else if (now - quietSinceRef.current >= QUIET_HOLD_MS) {
          setWarning('too_quiet');
        }
      } else {
        setWarning(null);
        quietSinceRef.current = null;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      source.disconnect();
      void audioContext.close();
    };
  }, [isActive, stream]);

  const isMeterActive = isActive && stream !== null;

  return {
    level: isMeterActive ? level : 0,
    warning: isMeterActive ? warning : null,
  };
}
