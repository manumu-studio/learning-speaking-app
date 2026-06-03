// Attest a multi-word expression against PHaVE/AFL corpus
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { MweLookup } from './corpus.types';

function sortedLemmaKey(phrase: string): string {
  return phrase.toLowerCase().split(/\s+/).sort().join(',');
}

/** Attest a phrase against PHaVE/AFL — exact lemmaKey match first, pg_trgm fuzzy fallback. */
export async function attestExpression(
  phrase: string,
): Promise<MweLookup | null> {
  const lemmaKey = sortedLemmaKey(phrase);

  // Try exact match on lemmaKey first
  const exact = await prisma.multiWordExpression.findFirst({
    where: { lemmaKey },
  });

  if (exact) {
    return {
      canonical: exact.canonical,
      type: exact.type,
      freq: exact.freq,
      cefr: exact.cefr,
      senseNote: exact.senseNote,
      source: exact.source,
      matchMethod: 'exact',
    };
  }

  // Fall back to pg_trgm fuzzy match on canonical form
  const canonical = phrase.toLowerCase();
  const fuzzyResults = await prisma.$queryRaw<
    Array<{
      canonical: string;
      type: string;
      freq: number | null;
      cefr: string | null;
      senseNote: string | null;
      source: string;
      similarity: number;
    }>
  >(
    Prisma.sql`
      SELECT "canonical", "type", "freq", "cefr", "senseNote", "source",
             similarity("canonical", ${canonical}) AS similarity
      FROM "multi_word_expressions"
      WHERE similarity("canonical", ${canonical}) > 0.3
      ORDER BY similarity DESC
      LIMIT 1
    `,
  );

  const match = fuzzyResults[0];
  if (!match) return null;

  return {
    canonical: match.canonical,
    type: match.type,
    freq: match.freq,
    cefr: match.cefr,
    senseNote: match.senseNote,
    source: match.source,
    matchMethod: 'fuzzy',
  };
}
