// State machine hook for Reading Practice flow
'use client';

import { useState, useCallback } from 'react';
import { z } from 'zod';
import type {
  ReadingPracticeState,
  GeneratedText,
  DifficultyLevel,
} from './ReadingPractice.types';

const GeneratedTextSchema = z.object({
  text: z.string(),
  targetPhonemes: z.array(z.string()),
  targetWords: z.array(z.string()),
});

export function useReadingPractice() {
  const [state, setState] = useState<ReadingPracticeState>('loading');
  const [generatedText, setGeneratedText] = useState<GeneratedText | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [error, setError] = useState<string | null>(null);

  const generateText = useCallback(async (
    weakPhonemes: string[],
    weakVocabulary: string[],
    level: DifficultyLevel,
  ) => {
    setState('loading');
    setError(null);

    try {
      const res = await fetch('/api/drills/reading-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakPhonemes, weakVocabulary, difficulty: level }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate practice text');
      }

      const json: unknown = await res.json();
      const parsed = GeneratedTextSchema.parse(json);
      setGeneratedText(parsed);
      setDifficulty(level);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('ready');
    }
  }, []);

  const startRecording = useCallback(() => setState('recording'), []);
  const startProcessing = useCallback(() => setState('processing'), []);
  const showResults = useCallback(() => setState('results'), []);
  const reset = useCallback(() => {
    setState('loading');
    setGeneratedText(null);
    setError(null);
  }, []);

  return {
    state,
    generatedText,
    difficulty,
    error,
    generateText,
    setDifficulty,
    startRecording,
    startProcessing,
    showResults,
    reset,
  };
}
