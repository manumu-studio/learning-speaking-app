// usePracticeFlow — practice state machine: text generation, recording, assessment
'use client';

import { useState, useCallback, useRef } from 'react';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import type {
  ReadingPracticeState,
  GeneratedText,
  DifficultyLevel,
  ReadingPracticeResult,
} from './ReadingPractice.types';
import {
  apiGenerateText,
  apiAssessRecording,
} from './useReadingPractice.api';

export interface UsePracticeFlowReturn {
  practiceState: ReadingPracticeState;
  generatedText: GeneratedText | null;
  difficulty: DifficultyLevel;
  practiceError: string | null;
  result: ReadingPracticeResult | null;
  recordingDuration: number;
  setDifficulty: (level: DifficultyLevel) => void;
  generateText: (phonemes: string[], vocab: string[], level: DifficultyLevel) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetPractice: () => void;
}

export function usePracticeFlow(): UsePracticeFlowReturn {
  const [practiceState, setPracticeState] = useState<ReadingPracticeState>('ready');
  const [generatedText, setGeneratedText] = useState<GeneratedText | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadingPracticeResult | null>(null);

  const recordedBlobRef = useRef<Blob | null>(null);

  const handleChunkReady = useCallback(({ wavBlob, isFinal }: { wavBlob: Blob; isFinal: boolean }) => {
    if (isFinal) recordedBlobRef.current = wavBlob;
  }, []);

  const audioWorklet = useAudioWorklet({
    chunkDurationSecs: 300,
    overlapSecs: 0,
    onChunkReady: handleChunkReady,
  });

  const generateText = useCallback(async (
    weakPhonemes: string[],
    weakVocabulary: string[],
    level: DifficultyLevel,
  ) => {
    setPracticeState('loading');
    setPracticeError(null);
    setResult(null);
    try {
      const text = await apiGenerateText(weakPhonemes, weakVocabulary, level);
      setGeneratedText(text);
      setDifficulty(level);
      setPracticeState('ready');
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Unknown error');
      setPracticeState('ready');
    }
  }, []);

  const startRecording = useCallback(async () => {
    recordedBlobRef.current = null;
    setResult(null);
    setPracticeError(null);
    setPracticeState('recording');
    await audioWorklet.startRecording();
  }, [audioWorklet]);

  const stopRecording = useCallback(async () => {
    setPracticeState('processing');
    await audioWorklet.stopRecording();
    await new Promise((resolve) => setTimeout(resolve, 200));

    const blob = recordedBlobRef.current;
    if (!blob || !generatedText) {
      setPracticeError('No recording captured');
      setPracticeState('ready');
      return;
    }
    try {
      const assessed = await apiAssessRecording(blob, generatedText.text, generatedText.targetWords);
      setResult(assessed);
      setPracticeState('results');
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Assessment failed');
      setPracticeState('ready');
    }
  }, [audioWorklet, generatedText]);

  const resetPractice = useCallback(() => {
    setGeneratedText(null);
    setPracticeError(null);
    setResult(null);
    setPracticeState('ready');
    audioWorklet.resetRecording();
  }, [audioWorklet]);

  return {
    practiceState,
    generatedText,
    difficulty,
    practiceError,
    result,
    recordingDuration: audioWorklet.duration,
    setDifficulty,
    generateText,
    startRecording,
    stopRecording,
    resetPractice,
  };
}
