// Orchestrates corpus evidence building — extracts candidates and runs parallel batch lookups
import { batchLookup, batchFindCollocations, batchAttestExpressions } from '@/lib/corpus';
import type { CorpusEvidence, CorpusStats, CollocationMatch, MweMatch } from './analysis.types';
import { extractTranscriptCandidates } from './extractTranscriptCandidates';

function computeStats(
  vocabulary: ReadonlyMap<string, { cefr: string | null; freqPerMillion: number | null }>,
  totalContentWords: number,
): CorpusStats {
  const cefrDistribution: Record<string, number> = {};
  const freqs: number[] = [];

  for (const entry of vocabulary.values()) {
    if (entry.cefr !== null) {
      const level = entry.cefr.toUpperCase();
      cefrDistribution[level] = (cefrDistribution[level] ?? 0) + 1;
    }
    if (entry.freqPerMillion !== null) {
      freqs.push(entry.freqPerMillion);
    }
  }

  const avgFreqPerMillion =
    freqs.length > 0
      ? freqs.reduce((sum, f) => sum + f, 0) / freqs.length
      : null;

  return {
    totalContentWords,
    matchedWords: vocabulary.size,
    cefrDistribution,
    avgFreqPerMillion,
  };
}

/**
 * Builds corpus evidence for a transcript by extracting candidates and
 * running batch lookups against all three corpus tables in parallel.
 *
 * Total latency target: < 50ms for a 300-word transcript.
 *
 * @param transcript - Raw transcript text.
 * @returns Structured corpus evidence for prompt injection and hybrid scoring.
 */
export async function buildCorpusEvidence(transcript: string): Promise<CorpusEvidence> {
  const { contentWords, pairs, phraseCandidates } = extractTranscriptCandidates(transcript);

  const [vocabulary, collocationMap, expressionMap] = await Promise.all([
    batchLookup(contentWords),
    batchFindCollocations(pairs),
    batchAttestExpressions(phraseCandidates),
  ]);

  const collocations: CollocationMatch[] = pairs.map((p) => ({
    head: p.head,
    collocate: p.collocate,
    lookup: collocationMap.get(`${p.head}::${p.collocate}`) ?? null,
  }));

  const expressions: MweMatch[] = [];
  for (const phrase of phraseCandidates) {
    const lookup = expressionMap.get(phrase);
    if (lookup !== undefined) {
      expressions.push({ phrase, lookup });
    }
  }

  const stats = computeStats(vocabulary, contentWords.length);

  return { vocabulary, collocations, expressions, stats };
}
