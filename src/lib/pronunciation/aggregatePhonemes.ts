// Aggregate per-phoneme scores across words to identify weak sounds the user struggles with

import { z } from 'zod';
import { sapiToIpa } from './sapiToIpa';

const MAX_WEAK_PHONEMES = 5;
const WEAK_THRESHOLD = 70;

const PhonemeDataSchema = z.object({
  phoneme: z.string(),
  accuracyScore: z.number(),
});

const WordWithPhonemesSchema = z.object({
  word: z.string(),
  phonemes: z.array(PhonemeDataSchema).catch([]),
});

export type AggregatedPhoneme = {
  phoneme: string;
  ipaSymbol: string;
  averageScore: number;
  occurrences: number;
  exampleWords: string[];
};

type PhonemeAccumulator = {
  scores: number[];
  words: Set<string>;
};

/**
 * Aggregates per-phoneme accuracy scores across all words in a pronunciation report.
 *
 * The `phonemes` field is a Prisma `Json` column, so each entry is validated with Zod at runtime.
 * Only phonemes with an average accuracy below 70 are included in the output.
 * Results are sorted ascending by `averageScore` (weakest first) and capped at 5.
 *
 * @param words - Raw word+phonemes data from the DB; `phonemes` may be any unknown JSON value.
 * @returns Up to 5 `AggregatedPhoneme` entries for the weakest phonemes, sorted weakest-first.
 */
// Accumulates per-phoneme scores and example words across all words in a report.
function accumulate(
  words: ReadonlyArray<{ word: string; phonemes: unknown }>,
): Map<string, PhonemeAccumulator> {
  const accumulator = new Map<string, PhonemeAccumulator>();

  for (const raw of words) {
    const parsed = WordWithPhonemesSchema.safeParse(raw);
    if (!parsed.success) continue;

    const { word, phonemes } = parsed.data;
    for (const ph of phonemes) {
      if (!ph.phoneme) continue;

      const key = ph.phoneme.toLowerCase();
      const existing = accumulator.get(key);
      if (existing) {
        existing.scores.push(ph.accuracyScore);
        existing.words.add(word.toLowerCase());
      } else {
        accumulator.set(key, {
          scores: [ph.accuracyScore],
          words: new Set([word.toLowerCase()]),
        });
      }
    }
  }

  return accumulator;
}

/**
 * Aggregates every tracked phoneme (no weak-filter, no cap), sorted weakest-first.
 *
 * This is the basis for functional-load ranking, which must consider phonemes the
 * raw weak-filter would discard (e.g. a high-functional-load /iː/ scoring 78).
 *
 * @param words - Raw word+phonemes data; `phonemes` may be any unknown JSON value.
 * @returns All `AggregatedPhoneme` entries, sorted ascending by `averageScore`.
 */
export function aggregateAllPhonemes(
  words: ReadonlyArray<{ word: string; phonemes: unknown }>,
): AggregatedPhoneme[] {
  const accumulator = accumulate(words);
  const results: AggregatedPhoneme[] = [];

  for (const [phoneme, data] of accumulator) {
    const avg = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
    results.push({
      phoneme,
      ipaSymbol: sapiToIpa(phoneme),
      averageScore: Math.round(avg * 10) / 10,
      occurrences: data.scores.length,
      exampleWords: [...data.words].slice(0, 3),
    });
  }

  return results.sort((a, b) => a.averageScore - b.averageScore);
}

export function aggregatePhonemes(
  words: ReadonlyArray<{ word: string; phonemes: unknown }>,
): AggregatedPhoneme[] {
  return aggregateAllPhonemes(words)
    .filter((p) => p.averageScore < WEAK_THRESHOLD)
    .slice(0, MAX_WEAK_PHONEMES);
}
