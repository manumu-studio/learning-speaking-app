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
export function aggregatePhonemes(
  words: ReadonlyArray<{ word: string; phonemes: unknown }>,
): AggregatedPhoneme[] {
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

  const results: AggregatedPhoneme[] = [];

  for (const [phoneme, data] of accumulator) {
    const avg = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
    if (avg >= WEAK_THRESHOLD) continue;

    results.push({
      phoneme,
      ipaSymbol: sapiToIpa(phoneme),
      averageScore: Math.round(avg * 10) / 10,
      occurrences: data.scores.length,
      exampleWords: [...data.words].slice(0, 3),
    });
  }

  return results
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, MAX_WEAK_PHONEMES);
}
