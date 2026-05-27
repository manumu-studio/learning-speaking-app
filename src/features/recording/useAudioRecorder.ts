// Custom hook for audio recording — state machine, VAD lifecycle, and optional auto-segmentation
'use client';

import { useReducer, useState, useRef, useCallback, useEffect } from 'react';
import {
  initialRecordingState,
  recordingStateReducer,
} from './recordingStateMachine';
import { getRecordingStatus } from './recordingState.types';
import type { UseAudioRecorderOptions, UseAudioRecorderReturn } from './useAudioRecorder.types';

const DEFAULT_MAX_DURATION_SECS = 300;
const DEFAULT_WARNING_BEFORE_SPLIT_SECS = 30;

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const recordingMode = options.recordingMode ?? 'press-to-toggle';
  const [machineState, dispatch] = useReducer(recordingStateReducer, initialRecordingState);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
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
  const durationRef = useRef(0);
  const optionsRef = useRef(options);
  const stopRecordingRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const state = getRecordingStatus(machineState);

  const audioBlob =
    machineState.status === 'validating' || machineState.status === 'stopped'
      ? machineState.audioBlob
      : null;

  const mimeType =
    machineState.status === 'recording'
      ? machineState.mimeType
      : machineState.status === 'validating' || machineState.status === 'stopped'
        ? machineState.mimeType
        : null;

  const vadWarning =
    machineState.status === 'stopped' ? machineState.vadWarning : null;

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setMediaStream(null);
  }, []);

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
          optionsRef.current.onSegmentReady?.(
            blob,
            segmentDurationRef.current,
            segmentIndexRef.current,
          );
          segmentIndexRef.current += 1;
          setSegmentIndex(segmentIndexRef.current);
          chunksRef.current = [];
          segmentDurationRef.current = 0;
          durationRef.current = 0;
          setDuration(0);

          const newRecorder = new MediaRecorder(streamRef.current, { mimeType });
          mediaRecorderRef.current = newRecorder;
          attachRecorderHandlers(newRecorder, mimeType);
          newRecorder.start(100);
          setIsAutoSegmenting(false);
          scheduleSegmentTimersRef.current();
        } else {
          clearSegmentTimers();
          clearDurationTimer();
          cleanupStream();
          dispatch({
            type: 'STOP_RECORDING',
            payload: {
              audioBlob: blob,
              duration: durationRef.current,
              mimeType: mimeTypeRef.current,
            },
          });
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        clearSegmentTimers();
        clearDurationTimer();
        cleanupStream();
        dispatch({ type: 'VALIDATION_FAILED' });
      };
    },
    [cleanupStream, clearDurationTimer, clearSegmentTimers],
  );

  const scheduleSegmentTimers = useCallback(() => {
    clearSegmentTimers();

    const configuredMax = optionsRef.current.maxDurationSecs;
    if (configuredMax === null) return;

    const maxDurationSecs = configuredMax ?? DEFAULT_MAX_DURATION_SECS;
    const warningBeforeSplitSecs =
      optionsRef.current.warningBeforeSplitSecs ?? DEFAULT_WARNING_BEFORE_SPLIT_SECS;

    if (warningBeforeSplitSecs > 0 && warningBeforeSplitSecs < maxDurationSecs) {
      const warningDelayMs = (maxDurationSecs - warningBeforeSplitSecs) * 1000;
      warningTimerRef.current = setTimeout(() => {
        let remaining = warningBeforeSplitSecs;
        setSecondsUntilSplit(remaining);
        optionsRef.current.onWarning?.(remaining);

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
          optionsRef.current.onWarning?.(remaining);
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
    if (machineState.status !== 'idle') return;

    try {
      setError(null);
      chunksRef.current = [];
      setDuration(0);
      durationRef.current = 0;
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
      setMediaStream(stream);

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
      dispatch({ type: 'START_RECORDING', mimeType });

      timerRef.current = setInterval(() => {
        const next = durationRef.current + 1;
        durationRef.current = next;
        setDuration(next);

        const limit = optionsRef.current.timeLimitSecs ?? null;
        if (limit !== null && next >= limit) {
          stopRecordingRef.current();
        }
      }, 1000);

      scheduleSegmentTimers();
    } catch (err) {
      cleanupStream();
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
      dispatch({ type: 'VALIDATION_FAILED' });
    }
  }, [
    attachRecorderHandlers,
    cleanupStream,
    clearSegmentTimers,
    machineState.status,
    scheduleSegmentTimers,
  ]);

  const stopRecording = useCallback(() => {
    if (machineState.status !== 'recording') return;
    clearSegmentTimers();
    clearDurationTimer();
    segmentDurationRef.current = durationRef.current;
    isAutoSegmentRef.current = false;
    mediaRecorderRef.current?.stop();
  }, [clearDurationTimer, clearSegmentTimers, machineState.status]);

  stopRecordingRef.current = stopRecording;

  const completeValidation = useCallback(
    (warning: { message: string; canProceed: true } | null) => {
      dispatch({ type: 'VALIDATION_PASSED', vadWarning: warning });
    },
    [],
  );

  const failValidation = useCallback((message: string) => {
    setError(message);
    dispatch({ type: 'VALIDATION_FAILED' });
    setDuration(0);
    durationRef.current = 0;
    chunksRef.current = [];
  }, []);

  const resetRecording = useCallback(() => {
    clearSegmentTimers();
    clearDurationTimer();
    dispatch({ type: 'RESET' });
    setDuration(0);
    durationRef.current = 0;
    setError(null);
    chunksRef.current = [];
    segmentIndexRef.current = 0;
    setSegmentIndex(0);
    setIsAutoSegmenting(false);
    setSecondsUntilSplit(null);
    cleanupStream();
  }, [cleanupStream, clearDurationTimer, clearSegmentTimers]);

  useEffect(() => {
    return () => {
      clearDurationTimer();
      clearSegmentTimers();
      cleanupStream();
    };
  }, [cleanupStream, clearDurationTimer, clearSegmentTimers]);

  return {
    state,
    duration,
    audioBlob,
    mimeType,
    mediaStream,
    vadWarning,
    error,
    recordingMode,
    startRecording,
    stopRecording,
    completeValidation,
    failValidation,
    resetRecording,
    segmentIndex,
    isAutoSegmenting,
    secondsUntilSplit,
    timeLimitSecs: options.timeLimitSecs ?? null,
  };
}
