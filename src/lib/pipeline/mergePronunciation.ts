// Merges per-chunk Azure pronunciation reports into a single weighted-average result
import { z } from 'zod';
import { WORD_ERROR_TYPES, type WordResult } from '@/lib/ai/azurePronunciation.types';

const wordResultSchema = z.object({
  word: z.string(),
  accuracyScore: z.number(),
  errorType: z.enum(WORD_ERROR_TYPES),
  offsetMs: z.number(),
  durationMs: z.number(),
  phonemes: z.array(z.unknown()),
  prosodyFeedback: z.object({
    breakErrorTypes: z.array(z.string()),
    breakLengthMs: z.number(),
    intonationErrorTypes: z.array(z.string()),
    monotoneSyllablePitchDeltaConfidence: z.number().optional(),
  }).optional(),
  l1Tags: z.array(z.string()).optional(),
}).passthrough();

const pronunciationReportSchema = z.object({
  pronScore: z.number(),
  accuracyScore: z.number(),
  fluencyScore: z.number(),
  completenessScore: z.number(),
  prosodyScore: z.number(),
  words: z.array(wordResultSchema),
});

export type ParsedPronunciationReport = z.infer<typeof pronunciationReportSchema>;

export interface ChunkPronunciationMergeInput {
  chunkIndex: number;
  durationSecs: number;
  overlapSecs: number;
  pronunciationReport: unknown;
}

export interface MergedPronunciationResult {
  pronScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number;
  speakingRateWpm: number;
  words: WordResult[];
}

function weightedAvg(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }
  return values.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

function estimateOverlapWordCount(overlapSecs: number): number {
  const AVG_WPM = 120;
  return Math.round((overlapSecs / 60) * AVG_WPM);
}

export function mergePronunciation(
  chunks: ChunkPronunciationMergeInput[],
): MergedPronunciationResult | null {
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  const parsed: Array<{
    report: ParsedPronunciationReport;
    durationSecs: number;
    overlapSecs: number;
    chunkIndex: number;
  }> = [];

  for (const chunk of sorted) {
    if (chunk.pronunciationReport == null) {
      continue;
    }
    const result = pronunciationReportSchema.safeParse(chunk.pronunciationReport);
    if (!result.success) {
      continue;
    }
    parsed.push({
      report: result.data,
      durationSecs: chunk.durationSecs,
      overlapSecs: chunk.overlapSecs,
      chunkIndex: chunk.chunkIndex,
    });
  }

  if (parsed.length === 0) {
    return null;
  }

  const mergedWords: WordResult[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const entry = parsed[i];
    if (!entry) {
      continue;
    }

    // Words are validated by wordResultSchema.passthrough() — safe to treat as WordResult
    let words = entry.report.words as unknown as WordResult[];

    if (i > 0) {
      const overlapWordCount = estimateOverlapWordCount(entry.overlapSecs);
      words = words.slice(overlapWordCount);
    }

    mergedWords.push(...words);
  }

  const weights = parsed.map((entry, i) => ({
    weight: Math.max(0.1, entry.durationSecs - (i === 0 ? 0 : entry.overlapSecs)),
    pronScore: entry.report.pronScore,
    accuracyScore: entry.report.accuracyScore,
    fluencyScore: entry.report.fluencyScore,
    completenessScore: entry.report.completenessScore,
    prosodyScore: entry.report.prosodyScore,
  }));

  const pronScore = weightedAvg(weights.map((w) => ({ value: w.pronScore, weight: w.weight })));
  const accuracyScore = weightedAvg(weights.map((w) => ({ value: w.accuracyScore, weight: w.weight })));
  const fluencyScore = weightedAvg(weights.map((w) => ({ value: w.fluencyScore, weight: w.weight })));
  const completenessScore = weightedAvg(
    weights.map((w) => ({ value: w.completenessScore, weight: w.weight })),
  );
  const prosodyScore = weightedAvg(weights.map((w) => ({ value: w.prosodyScore, weight: w.weight })));

  const totalEffectiveSecs = weights.reduce((sum, w) => sum + w.weight, 0);
  const validWords = mergedWords.filter(
    (word) => word.errorType !== 'Insertion' && word.errorType !== 'Omission',
  );
  const speakingRateWpm =
    totalEffectiveSecs > 0 ? validWords.length / (totalEffectiveSecs / 60) : 0;

  return {
    pronScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    prosodyScore,
    speakingRateWpm,
    words: mergedWords,
  };
}
