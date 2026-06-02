// State machine hook for Reading Practice — library data, text generation, recording + assessment
'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  ReadingPracticeView,
  ReadingPracticeLibraryData,
  ReadingPracticeSession,
  DifficultyLevel,
} from './ReadingPractice.types';
import { apiFetchLibrary } from './useReadingPractice.api';
import { usePracticeFlow } from './usePracticeFlow';

export function useReadingPractice() {
  const [view, setView] = useState<ReadingPracticeView>('library');
  const [libraryData, setLibraryData] = useState<ReadingPracticeLibraryData | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ReadingPracticeSession | null>(null);

  const {
    practiceState,
    generatedText,
    difficulty,
    practiceError,
    result,
    recordingDuration,
    setDifficulty,
    generateText,
    startRecording,
    stopRecording,
    resetPractice,
  } = usePracticeFlow();

  useEffect(() => {
    async function fetchLibrary() {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        setLibraryData(await apiFetchLibrary());
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLibraryLoading(false);
      }
    }
    void fetchLibrary();
  }, []);

  const selectSession = useCallback((session: ReadingPracticeSession) => {
    setSelectedSession(session);
    resetPractice();
    setView('practice');
  }, [resetPractice]);

  const generateForSession = useCallback((level: DifficultyLevel) => {
    if (!selectedSession) return;
    const phonemes = selectedSession.weakPhonemes.map((p) => p.ipaSymbol);
    const vocab = selectedSession.vocab.filter((v) => !v.adopted).map((v) => v.word);
    void generateText(phonemes, vocab, level);
  }, [selectedSession, generateText]);

  const backToLibrary = useCallback(() => {
    setView('library');
    setSelectedSession(null);
    resetPractice();
  }, [resetPractice]);

  return {
    view,
    libraryData,
    libraryLoading,
    libraryError,
    selectedSession,
    selectSession,
    backToLibrary,
    practiceState,
    generatedText,
    difficulty,
    practiceError,
    result,
    setDifficulty,
    generateForSession,
    generateText,
    recordingDuration,
    startRecording,
    stopRecording,
  };
}
