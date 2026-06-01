// State machine hook for Reading Practice — library data, text generation, recording + assessment
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import type {
  ReadingPracticeView,
  ReadingPracticeState,
  ReadingPracticeLibraryData,
  ReadingPracticeSession,
  GeneratedText,
  DifficultyLevel,
  WordScore,
  ReadingPracticeResult,
} from './ReadingPractice.types';

const GeneratedTextSchema = z.object({
  text: z.string(),
  targetPhonemes: z.array(z.string()),
  targetWords: z.array(z.string()),
});

const LibraryResponseSchema = z.object({
  globalWeaknesses: z.object({
    phonemes: z.array(z.object({
      phoneme: z.string(),
      ipaSymbol: z.string(),
      averageScore: z.number(),
      occurrences: z.number(),
      exampleWords: z.array(z.string()),
    })),
    unadoptedVocab: z.array(z.object({
      word: z.string(),
      meaning: z.string(),
    })),
  }),
  sessions: z.array(z.object({
    id: z.string(),
    workoutNumber: z.number(),
    intentLabel: z.string(),
    createdAt: z.string(),
    pronScore: z.number().nullable(),
    weakPhonemes: z.array(z.object({
      phoneme: z.string(),
      ipaSymbol: z.string(),
      averageScore: z.number(),
      occurrences: z.number(),
      exampleWords: z.array(z.string()),
    })),
    mispronounced: z.array(z.object({
      word: z.string(),
      accuracyScore: z.number(),
      errorType: z.string(),
    })),
    vocab: z.array(z.object({
      word: z.string(),
      meaning: z.string(),
      adopted: z.boolean(),
    })),
  })),
});

const AssessResultSchema = z.object({
  pronScore: z.number(),
  accuracyScore: z.number(),
  fluencyScore: z.number(),
  completenessScore: z.number(),
  prosodyScore: z.number(),
  words: z.array(z.object({
    word: z.string(),
    accuracyScore: z.number(),
    errorType: z.string(),
  })),
});

export function useReadingPractice() {
  // Library state
  const [view, setView] = useState<ReadingPracticeView>('library');
  const [libraryData, setLibraryData] = useState<ReadingPracticeLibraryData | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ReadingPracticeSession | null>(null);

  // Practice flow state
  const [practiceState, setPracticeState] = useState<ReadingPracticeState>('ready');
  const [generatedText, setGeneratedText] = useState<GeneratedText | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadingPracticeResult | null>(null);

  // Recording refs
  const recordedBlobRef = useRef<Blob | null>(null);

  const handleChunkReady = useCallback(({ wavBlob, isFinal }: { wavBlob: Blob; isFinal: boolean }) => {
    if (isFinal) {
      recordedBlobRef.current = wavBlob;
    }
  }, []);

  const audioWorklet = useAudioWorklet({
    chunkDurationSecs: 300, // single chunk — reading practice is short
    overlapSecs: 0,
    onChunkReady: handleChunkReady,
  });

  // Fetch library data on mount
  useEffect(() => {
    async function fetchLibrary() {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const res = await fetch('/api/users/me/reading-practice-sessions');
        if (!res.ok) throw new Error('Failed to load reading practice data');
        const json: unknown = await res.json();
        const parsed = LibraryResponseSchema.parse(json);
        setLibraryData(parsed);
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLibraryLoading(false);
      }
    }
    void fetchLibrary();
  }, []);

  // Select a session and switch to practice view
  const selectSession = useCallback((session: ReadingPracticeSession) => {
    setSelectedSession(session);
    setGeneratedText(null);
    setPracticeError(null);
    setPracticeState('ready');
    setResult(null);
    setView('practice');
  }, []);

  // Generate text for the selected session
  const generateText = useCallback(async (
    weakPhonemes: string[],
    weakVocabulary: string[],
    level: DifficultyLevel,
  ) => {
    setPracticeState('loading');
    setPracticeError(null);
    setResult(null);

    try {
      const res = await fetch('/api/drills/reading-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakPhonemes, weakVocabulary, difficulty: level }),
      });

      if (!res.ok) throw new Error('Failed to generate practice text');

      const json: unknown = await res.json();
      const parsed = GeneratedTextSchema.parse(json);
      setGeneratedText(parsed);
      setDifficulty(level);
      setPracticeState('ready');
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Unknown error');
      setPracticeState('ready');
    }
  }, []);

  // Generate for the currently selected session
  const generateForSession = useCallback((level: DifficultyLevel) => {
    if (!selectedSession) return;

    const phonemes = selectedSession.weakPhonemes.map((p) => p.ipaSymbol);
    const vocab = selectedSession.vocab
      .filter((v) => !v.adopted)
      .map((v) => v.word);

    void generateText(phonemes, vocab, level);
  }, [selectedSession, generateText]);

  // Start recording
  const startRecording = useCallback(async () => {
    recordedBlobRef.current = null;
    setResult(null);
    setPracticeError(null);
    setPracticeState('recording');
    await audioWorklet.startRecording();
  }, [audioWorklet]);

  // Stop recording and assess
  const stopRecording = useCallback(async () => {
    setPracticeState('processing');
    await audioWorklet.stopRecording();

    // Small delay to ensure onChunkReady fires
    await new Promise((resolve) => setTimeout(resolve, 200));

    const blob = recordedBlobRef.current;
    if (!blob || !generatedText) {
      setPracticeError('No recording captured');
      setPracticeState('ready');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      formData.append('referenceText', generatedText.text);

      const res = await fetch('/api/drills/reading-practice/assess', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Assessment failed');

      const json: unknown = await res.json();
      const parsed = AssessResultSchema.parse(json);

      // Map assessment words to WordScore with target flags
      const targetWords = new Set(generatedText.targetWords.map((w) => w.toLowerCase()));
      const wordScores: WordScore[] = parsed.words.map((w) => ({
        word: w.word,
        accuracyScore: w.accuracyScore,
        isTarget: targetWords.has(w.word.toLowerCase()),
      }));

      setResult({
        wordScores,
        overallScore: parsed.pronScore,
        targetPhonemeScores: [], // Could be populated from phoneme-level data in the future
      });
      setPracticeState('results');
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Assessment failed');
      setPracticeState('ready');
    }
  }, [audioWorklet, generatedText]);

  // Back to library
  const backToLibrary = useCallback(() => {
    setView('library');
    setSelectedSession(null);
    setGeneratedText(null);
    setPracticeError(null);
    setResult(null);
    audioWorklet.resetRecording();
  }, [audioWorklet]);

  return {
    // Library
    view,
    libraryData,
    libraryLoading,
    libraryError,
    selectedSession,
    selectSession,
    backToLibrary,
    // Practice
    practiceState,
    generatedText,
    difficulty,
    practiceError,
    result,
    setDifficulty,
    generateForSession,
    generateText,
    // Recording
    recordingDuration: audioWorklet.duration,
    startRecording,
    stopRecording,
  };
}
