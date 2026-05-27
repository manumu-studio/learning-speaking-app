// Custom hook for managing audio recording via MediaRecorder API with optional auto-segmentation
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type RecordingState = 'idle' | 'recording' | 'stopped';

export interface AudioRecorderConfig {
  maxDurationSecs?: number | null;
  onSegmentReady?: (blob: Blob, segmentDuration: number, segmentIndex: number) => void;
  warningBeforeSplitSecs?: number;
  onWarning?: (secondsRemaining: number) => void;
}

interface UseAudioRecorderReturn {
  state: RecordingState;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  segmentIndex: number;
  isAutoSegmenting: boolean;
  secondsUntilSplit: number | null;
}

const DEFAULT_MAX_DURATION_SECS = 300;
const DEFAULT_WARNING_BEFORE_SPLIT_SECS = 30;

export function useAudioRecorder(config?: AudioRecorderConfig): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isAutoSegmenting, setIsAutoSegmenting] = useState(false);
  const [secondsUntilSplit, setSecondsUntilSplit] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentBoundaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoSegmentRef = useRef(false);
  const segmentIndexRef = useRef(0);
  const segmentDurationRef = useRef(0);
  const mimeTypeRef = useRef<string>('audio/webm');
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const clearSegmentTimers = useCallback(() => {
    if (segmentBoundaryTimerRef.current) {
      clearTimeout(segmentBoundaryTimerRef.current);
      segmentBoundaryTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
    setSecondsUntilSplit(null);
  }, []);

  const clearDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleSegmentTimersRef = useRef<() => void>(() => undefined);

  const attachRecorderHandlers = useCallback(
    (mediaRecorder: MediaRecorder, mimeType: string) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const wasAutoSegment = isAutoSegmentRef.current;
        isAutoSegmentRef.current = false;

        if (wasAutoSegment && streamRef.current) {
          setIsAutoSegmenting(true);
          configRef.current?.onSegmentReady?.(
            blob,
            segmentDurationRef.current,
            segmentIndexRef.current
          );
          segmentIndexRef.current += 1;
          setSegmentIndex(segmentIndexRef.current);
          chunksRef.current = [];
          segmentDurationRef.current = 0;
          setDuration(0);

          const newRecorder = new MediaRecorder(streamRef.current, { mimeType });
          mediaRecorderRef.current = newRecorder;
          attachRecorderHandlers(newRecorder, mimeType);
          newRecorder.start(100);
          setIsAutoSegmenting(false);
          scheduleSegmentTimersRef.current();
        } else {
          setAudioBlob(blob);
          setState('stopped');

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        setState('idle');
      };
    },
    []
  );

  const scheduleSegmentTimers = useCallback(() => {
    clearSegmentTimers();

    const configuredMax = configRef.current?.maxDurationSecs;
    if (configuredMax === null) return;

    const maxDurationSecs = configuredMax ?? DEFAULT_MAX_DURATION_SECS;

    const warningBeforeSplitSecs =
      configRef.current?.warningBeforeSplitSecs ?? DEFAULT_WARNING_BEFORE_SPLIT_SECS;

    if (warningBeforeSplitSecs > 0 && warningBeforeSplitSecs < maxDurationSecs) {
      const warningDelayMs = (maxDurationSecs - warningBeforeSplitSecs) * 1000;
      warningTimerRef.current = setTimeout(() => {
        let remaining = warningBeforeSplitSecs;
        setSecondsUntilSplit(remaining);
        configRef.current?.onWarning?.(remaining);

        warningIntervalRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            if (warningIntervalRef.current) {
              clearInterval(warningIntervalRef.current);
              warningIntervalRef.current = null;
            }
            setSecondsUntilSplit(null);
            return;
          }
          setSecondsUntilSplit(remaining);
          configRef.current?.onWarning?.(remaining);
        }, 1000);
      }, warningDelayMs);
    }

    segmentBoundaryTimerRef.current = setTimeout(() => {
      clearSegmentTimers();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        segmentDurationRef.current = maxDurationSecs;
        isAutoSegmentRef.current = true;
        mediaRecorderRef.current.stop();
      }
    }, maxDurationSecs * 1000);
  }, [clearSegmentTimers]);

  scheduleSegmentTimersRef.current = scheduleSegmentTimers;

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      setDuration(0);
      segmentIndexRef.current = 0;
      setSegmentIndex(0);
      setIsAutoSegmenting(false);
      clearSegmentTimers();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));

      if (!mimeType) {
        throw new Error('No supported audio MIME type found');
      }

      mimeTypeRef.current = mimeType;
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      attachRecorderHandlers(mediaRecorder, mimeType);
      mediaRecorder.start(100);
      setState('recording');

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      scheduleSegmentTimers();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.');
        } else {
          setError(`Failed to start recording: ${err.message}`);
        }
      } else {
        setError('Failed to start recording');
      }
      setState('idle');
    }
  }, [attachRecorderHandlers, clearSegmentTimers, scheduleSegmentTimers]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      clearSegmentTimers();
      clearDurationTimer();
      segmentDurationRef.current = duration;
      isAutoSegmentRef.current = false;
      mediaRecorderRef.current.stop();
    }
  }, [state, duration, clearSegmentTimers, clearDurationTimer]);

  const resetRecording = useCallback(() => {
    clearSegmentTimers();
    clearDurationTimer();
    setState('idle');
    setDuration(0);
    setAudioBlob(null);
    setError(null);
    chunksRef.current = [];
    segmentIndexRef.current = 0;
    setSegmentIndex(0);
    setIsAutoSegmenting(false);
    setSecondsUntilSplit(null);
  }, [clearSegmentTimers, clearDurationTimer]);

  useEffect(() => {
    return () => {
      clearDurationTimer();
      clearSegmentTimers();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [clearDurationTimer, clearSegmentTimers]);

  return {
    state,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording,
    segmentIndex,
    isAutoSegmenting,
    secondsUntilSplit,
  };
}
