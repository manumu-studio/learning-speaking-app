// Lookup a single word in the corpus lexeme tables
import { prisma } from '@/lib/prisma';
import type { LexemeLookup } from './corpus.types';

const SOURCE_PRIORITY = ['NGSL', 'NAWL', 'SUBTLEX', 'CEFR_J', 'OCTANOVE'] as const;

/** Look up a single word's frequency, CEFR level, and source — best source wins per SOURCE_PRIORITY. */
export async function lookupLexeme(
  lemma: string,
  pos?: string,
): Promise<LexemeLookup | null> {
  const where = pos
    ? { lemma: lemma.toLowerCase(), pos: pos.toLowerCase() }
    : { lemma: lemma.toLowerCase() };

  const rows = await prisma.lexeme.findMany({ where });
  if (rows.length === 0) return null;

  // Pick best source for frequency data (iterate priority order, not DB order)
  let freqRow: (typeof rows)[0] | undefined;
  for (const src of SOURCE_PRIORITY) {
    freqRow = rows.find((r) => r.source === src && r.freqPerMillion !== null);
    if (freqRow) break;
  }
  freqRow ??= rows[0];

  // Pick best CEFR level (prefer CEFR_J/OCTANOVE)
  const cefrRow = rows.find((r) => r.cefr !== null);

  if (!freqRow) return null;

  return {
    lemma: freqRow.lemma,
    pos: freqRow.pos,
    freqPerMillion: freqRow.freqPerMillion,
    zipf: freqRow.zipf,
    cefr: cefrRow?.cefr ?? null,
    rank: freqRow.rank,
    source: freqRow.source,
  };
}
