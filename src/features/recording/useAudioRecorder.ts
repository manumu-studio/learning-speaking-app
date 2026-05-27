// Custom hook for managing audio recording via MediaRecorder API and state machine
'use client';

import { useReducer, useState, useRef, useCallback, useEffect } from 'react';
import {
  initialRecordingState,
  recordingStateReducer,
} from './recordingStateMachine';
import { getRecordingStatus } from './recordingState.types';
import type { UseAudioRecorderOptions, UseAudioRecorderReturn } from './useAudioRecorder.types';

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const recordingMode = options.recordingMode ?? 'press-to-toggle';
  const [machineState, dispatch] = useReducer(recordingStateReducer, initialRecordingState);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const durationRef = useRef(0);

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

  const startRecording = useCallback(async () => {
    if (machineState.status !== 'idle') return;

    try {
      setError(null);
      chunksRef.current = [];
      setDuration(0);
      durationRef.current = 0;

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        cleanupStream();
        dispatch({
          type: 'STOP_RECORDING',
          payload: {
            audioBlob: blob,
            duration: durationRef.current,
            mimeType: mimeTypeRef.current,
          },
        });
      };

      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        cleanupStream();
        dispatch({ type: 'VALIDATION_FAILED' });
      };

      mediaRecorder.start(100);
      dispatch({ type: 'START_RECORDING', mimeType });

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration((prev) => prev + 1);
      }, 1000);
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
  }, [cleanupStream, machineState.status]);

  const stopRecording = useCallback(() => {
    if (machineState.status !== 'recording') return;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [machineState.status]);

  const completeValidation = useCallback(
    (vadWarning: { message: string; canProceed: true } | null) => {
      dispatch({ type: 'VALIDATION_PASSED', vadWarning });
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
    dispatch({ type: 'RESET' });
    setDuration(0);
    durationRef.current = 0;
    setError(null);
    chunksRef.current = [];
    cleanupStream();
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupStream();
    };
  }, [cleanupStream]);

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
  };
}
