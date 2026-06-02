// API helpers for Reading Practice — fetch, generate, and assess calls
import { z } from 'zod';
import type {
  ReadingPracticeLibraryData,
  GeneratedText,
  DifficultyLevel,
  WordScore,
  ReadingPracticeResult,
} from './ReadingPractice.types';

export const GeneratedTextSchema = z.object({
  text: z.string(),
  targetPhonemes: z.array(z.string()),
  targetWords: z.array(z.string()),
});

export const LibraryResponseSchema = z.object({
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

export const AssessResultSchema = z.object({
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

export async function apiFetchLibrary(): Promise<ReadingPracticeLibraryData> {
  const res = await fetch('/api/users/me/reading-practice-sessions');
  if (!res.ok) throw new Error('Failed to load reading practice data');
  const json: unknown = await res.json();
  return LibraryResponseSchema.parse(json);
}

export async function apiGenerateText(
  weakPhonemes: string[],
  weakVocabulary: string[],
  level: DifficultyLevel,
): Promise<GeneratedText> {
  const res = await fetch('/api/drills/reading-practice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weakPhonemes, weakVocabulary, difficulty: level }),
  });
  if (!res.ok) throw new Error('Failed to generate practice text');
  const json: unknown = await res.json();
  return GeneratedTextSchema.parse(json);
}

export async function apiAssessRecording(
  blob: Blob,
  referenceText: string,
  targetWords: string[],
): Promise<ReadingPracticeResult> {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.wav');
  formData.append('referenceText', referenceText);
  const res = await fetch('/api/drills/reading-practice/assess', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Assessment failed');
  const json: unknown = await res.json();
  const parsed = AssessResultSchema.parse(json);
  const targetSet = new Set(targetWords.map((w) => w.toLowerCase()));
  const wordScores: WordScore[] = parsed.words.map((w) => ({
    word: w.word,
    accuracyScore: w.accuracyScore,
    isTarget: targetSet.has(w.word.toLowerCase()),
  }));
  return { wordScores, overallScore: parsed.pronScore, targetPhonemeScores: [] };
}
