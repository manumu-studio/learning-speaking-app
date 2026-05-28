// matchInsightsToSentences: fuzzy-matches insight examples to transcript sentences,
// returning an AnnotationMap keyed by sentence index

import type { TranscriptSentence } from './splitSentences';
import type { AnnotationMap, PinVariant, SentenceAnnotation } from './annotationTypes';

/** Insight shape accepted by this utility — subset of SessionDetail.insights */
export interface MatchableInsight {
  id: string;
  category: string;
  pattern: string;
  suggestion: string | null;
  examples: string[] | null;
}

/** Metric snapshot shape accepted by this utility */
export interface MatchableMetric {
  key: string;
  score: number;
}

const CATEGORY_TO_METRIC_KEY: Record<string, string> = {
  filler: 'fillerUsage',
  connector: 'connectorRepetition',
  structure: 'structuralVariety',
  vocabulary: 'vocabularyPrecision',
  verb: 'verbAccuracy',
  grammar: 'verbAccuracy',
  closure: 'argumentClosure',
};

function resolveVariant(category: string, metrics: MatchableMetric[]): PinVariant {
  const metricKey = CATEGORY_TO_METRIC_KEY[category.toLowerCase()];
  if (metricKey === undefined) return 'building';

  const metric = metrics.find((m) => m.key === metricKey);
  if (metric === undefined) return 'building';

  if (metric.score >= 8) return 'strength';
  if (metric.score >= 5) return 'building';
  return 'sharpen';
}

function substringMatch(sentence: string, example: string): boolean {
  return sentence.toLowerCase().includes(example.toLowerCase());
}

function wordOverlapMatch(sentence: string, example: string): boolean {
  const sentenceWords = new Set(sentence.toLowerCase().match(/\b\w+\b/g) ?? []);
  const exampleWords = (example.toLowerCase().match(/\b\w+\b/g) ?? []).filter((w) => w.length > 2);

  if (exampleWords.length === 0) return false;

  const matchCount = exampleWords.filter((w) => sentenceWords.has(w)).length;
  return matchCount / exampleWords.length >= 0.6;
}

export function matchInsightsToSentences(
  insights: MatchableInsight[],
  sentences: TranscriptSentence[],
  metrics: MatchableMetric[],
): AnnotationMap {
  const map: AnnotationMap = new Map();

  for (const insight of insights) {
    const examples = insight.examples ?? [];
    if (examples.length === 0) continue;

    const pinVariant = resolveVariant(insight.category, metrics);

    const annotation: SentenceAnnotation = {
      insightId: insight.id,
      category: insight.category,
      pattern: insight.pattern,
      suggestion: insight.suggestion,
      pinVariant,
    };

    const matchedIndices = new Set<number>();

    for (const example of examples) {
      if (example.trim().length === 0) continue;

      for (const sentence of sentences) {
        if (matchedIndices.has(sentence.index)) continue;

        const matched =
          substringMatch(sentence.text, example) || wordOverlapMatch(sentence.text, example);

        if (matched) {
          matchedIndices.add(sentence.index);
          const existing = map.get(sentence.index) ?? [];
          map.set(sentence.index, [...existing, annotation]);
        }
      }
    }
  }

  return map;
}
