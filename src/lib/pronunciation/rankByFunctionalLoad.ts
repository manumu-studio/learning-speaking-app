// Ranks pronunciation errors by functional load (weight × frequency), mixing phoneme-level
// errors (joined to Azure per-phoneme scores) with structural L1 patterns detected from word data.

import { z } from 'zod';
import { aggregateAllPhonemes } from './aggregatePhonemes';
import { PHONEME_FL_ENTRIES, STRUCTURAL_FL_ENTRIES } from './functionalLoad';
import type { RankedFLError } from './functionalLoad.types';

/** Accuracy below this is "not yet solid" for a C2 target — eligible as a functional-load error. */
const ACCURACY_FLOOR = 85;

/** Word-initial s + consonant: the epenthesis trigger ("school", "speak", "student"). */
const S_CLUSTER_ONSET = /^s[ckpqtbdgfmnlvwz]/i;

/** SAPI consonant codes — used to detect a word-final consonant phonetically (spelling-proof). */
const CONSONANTS = new Set([
  'b', 'ch', 'd', 'dh', 'f', 'g', 'hh', 'jh', 'k', 'l', 'm', 'n', 'ng',
  'p', 'r', 's', 'sh', 't', 'th', 'v', 'w', 'y', 'z', 'zh',
]);

const round1 = (n: number): number => Math.round(n * 10) / 10;

type WordInput = { word: string; phonemes: unknown };
type ParsedPhoneme = { phoneme: string; accuracyScore: number };

const PhonemeScoreSchema = z.object({ phoneme: z.string().catch(''), accuracyScore: z.number() });
const WordSchema = z.object({ word: z.string(), phonemes: z.array(PhonemeScoreSchema).catch([]) });

// Parses a raw word into its ordered phonemes (empty if invalid).
function parsePhonemes(raw: WordInput): ParsedPhoneme[] {
  const parsed = WordSchema.safeParse(raw);
  return parsed.success ? parsed.data.phonemes : [];
}

// Builds a ranked error from a structural entry given the qualifying low scores.
function structuralError(entryId: string, lowScores: number[]): RankedFLError | null {
  const entry = STRUCTURAL_FL_ENTRIES.find((e) => e.id === entryId);
  if (!entry || lowScores.length === 0) return null;
  const avg = lowScores.reduce((s, v) => s + v, 0) / lowScores.length;
  return {
    ...entry,
    averageScore: round1(avg),
    occurrences: lowScores.length,
    flScore: entry.weight * lowScores.length,
  };
}

// Detects s-cluster epenthesis and dropped-final-consonant patterns from per-word phoneme scores.
function detectStructural(words: ReadonlyArray<WordInput>): RankedFLError[] {
  const sCluster: number[] = [];
  const finalC: number[] = [];

  for (const raw of words) {
    const word = typeof raw.word === 'string' ? raw.word : '';
    const phonemes = parsePhonemes(raw);
    if (phonemes.length === 0) continue;

    const onset = phonemes[0];
    if (S_CLUSTER_ONSET.test(word) && onset !== undefined && onset.accuracyScore < ACCURACY_FLOOR) {
      sCluster.push(onset.accuracyScore);
    }
    const last = phonemes[phonemes.length - 1];
    if (last !== undefined && CONSONANTS.has(last.phoneme.toLowerCase()) && last.accuracyScore < ACCURACY_FLOOR) {
      finalC.push(last.accuracyScore);
    }
  }

  return [structuralError('s-cluster', sCluster), structuralError('final-consonant', finalC)].filter(
    (e): e is RankedFLError => e !== null,
  );
}

// Builds ranked phoneme-level errors by joining the FL table to aggregated Azure scores.
function detectPhonemeErrors(words: ReadonlyArray<WordInput>): RankedFLError[] {
  const all = aggregateAllPhonemes(words);
  const out: RankedFLError[] = [];

  for (const entry of PHONEME_FL_ENTRIES) {
    const matches = all.filter(
      (p) => entry.ipaSymbols.includes(p.ipaSymbol) && p.averageScore < ACCURACY_FLOOR,
    );
    if (matches.length === 0) continue;

    const occurrences = matches.reduce((s, m) => s + m.occurrences, 0);
    const weightedSum = matches.reduce((s, m) => s + m.averageScore * m.occurrences, 0);
    out.push({
      ...entry,
      averageScore: round1(weightedSum / occurrences),
      occurrences,
      flScore: entry.weight * occurrences,
    });
  }

  return out;
}

// Sorts errors by functional-load score, then tier weight, then weakest score first.
function byPriority(a: RankedFLError, b: RankedFLError): number {
  if (b.flScore !== a.flScore) return b.flScore - a.flScore;
  if (b.weight !== a.weight) return b.weight - a.weight;
  return (a.averageScore ?? 100) - (b.averageScore ?? 100);
}

/**
 * Ranks a session's pronunciation errors by functional load (weight × frequency).
 *
 * Combines phoneme-level errors (joined to Azure per-phoneme accuracy) with structural
 * L1 patterns (s-cluster epenthesis, dropped final consonants) detected from word data.
 * Only errors below the C2 accuracy floor (85) are included.
 *
 * @param words - Raw word+phonemes data from the pronunciation report.
 * @returns Ranked errors, highest functional-load impact first.
 */
export function rankByFunctionalLoad(words: ReadonlyArray<WordInput>): RankedFLError[] {
  return [...detectPhonemeErrors(words), ...detectStructural(words)].sort(byPriority);
}

/** Splits ranked errors into high/moderate "priority" sounds and low-FL "accent polish". */
export function splitByPriority(ranked: ReadonlyArray<RankedFLError>): {
  priority: RankedFLError[];
  polish: RankedFLError[];
} {
  return {
    priority: ranked.filter((e) => e.tier !== 'low'),
    polish: ranked.filter((e) => e.tier === 'low'),
  };
}
