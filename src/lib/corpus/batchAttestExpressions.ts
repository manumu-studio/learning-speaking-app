// Batch MWE attestation — single Prisma query for multiple phrases (exact match only)
import { prisma } from '@/lib/prisma';
import type { MweLookup } from './corpus.types';

function sortedLemmaKey(phrase: string): string {
  return phrase.toLowerCase().split(/\s+/).sort().join(',');
}

/**
 * Attests multiple phrases against the MWE corpus in a single query.
 *
 * Uses exact lemmaKey matching only (no pg_trgm fuzzy) for batch performance.
 * Deduplicates by computed lemmaKey internally.
 *
 * @param phrases - Array of phrase strings to check.
 * @returns Map keyed by original phrase with the matched MWE lookup.
 */
export async function batchAttestExpressions(
  phrases: readonly string[],
): Promise<Map<string, MweLookup>> {
  if (phrases.length === 0) return new Map();

  const keyToPhrase = new Map<string, string>();
  for (const phrase of phrases) {
    const key = sortedLemmaKey(phrase);
    if (!keyToPhrase.has(key)) {
      keyToPhrase.set(key, phrase);
    }
  }

  const rows = await prisma.multiWordExpression.findMany({
    where: { lemmaKey: { in: [...keyToPhrase.keys()] } },
  });

  const result = new Map<string, MweLookup>();

  for (const row of rows) {
    const originalPhrase = keyToPhrase.get(row.lemmaKey);
    if (originalPhrase === undefined) continue;

    const existing = result.get(originalPhrase);
    if (existing !== undefined) continue;

    result.set(originalPhrase, {
      canonical: row.canonical,
      type: row.type,
      freq: row.freq,
      cefr: row.cefr,
      senseNote: row.senseNote,
      source: row.source,
      matchMethod: 'exact',
    });
  }

  return result;
}
