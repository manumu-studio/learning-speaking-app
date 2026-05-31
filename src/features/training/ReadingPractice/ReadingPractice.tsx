// Reading Practice — AI generates text targeting weak sounds, user reads aloud for pronunciation assessment
'use client';

import { useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { useReadingPractice } from './useReadingPractice';
import type { DifficultyLevel } from './ReadingPractice.types';

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function ReadingPractice() {
  const {
    state,
    generatedText,
    difficulty,
    error,
    generateText,
    setDifficulty,
  } = useReadingPractice();

  useEffect(() => {
    void generateText([], [], 'intermediate');
  }, [generateText]);

  const handleRegenerate = () => {
    void generateText([], [], difficulty);
  };

  const handleDifficultyChange = (level: DifficultyLevel) => {
    setDifficulty(level);
    void generateText([], [], level);
  };

  return (
    <Container className="max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reading Practice
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Read the text aloud to practice pronunciation of target sounds
        </p>
      </div>

      {/* Difficulty selector */}
      <div className="mb-6 flex gap-2">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleDifficultyChange(opt.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              difficulty === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-500 animate-pulse dark:text-gray-400">
            Generating practice text...
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={handleRegenerate}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Text display */}
      {generatedText && state !== 'loading' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-lg leading-relaxed text-gray-900 dark:text-gray-100">
              {generatedText.text}
            </p>
          </div>

          {/* Target indicators */}
          {(generatedText.targetPhonemes.length > 0 || generatedText.targetWords.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {generatedText.targetPhonemes.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-amber-100 px-2.5 py-1 font-mono text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                >
                  /{p}/
                </span>
              ))}
              {generatedText.targetWords.map((w) => (
                <span
                  key={w}
                  className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                >
                  {w}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              New Text
            </button>
            <button
              type="button"
              disabled
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white opacity-50"
              title="Recording integration coming soon"
            >
              Record Reading
            </button>
          </div>

          {/* Placeholder for future recording + results integration */}
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recording and pronunciation assessment will be integrated here.
              For now, use this to generate practice texts targeting your weak sounds.
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
