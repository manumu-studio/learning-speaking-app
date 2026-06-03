// Bulk lexeme lookup for an entire transcript's vocabulary
import { prisma } from '@/lib/prisma';
import type { LexemeLookup } from './corpus.types';

const SOURCE_PRIORITY = ['NGSL', 'NAWL', 'SUBTLEX', 'CEFR_J', 'OCTANOVE'] as const;

/** Bulk-resolve an entire transcript's vocabulary against the corpus in a single query. */
export async function batchLookup(
  words: readonly string[],
): Promise<Map<string, LexemeLookup>> {
  const normalized = [...new Set(words.map((w) => w.toLowerCase()))];
  if (normalized.length === 0) return new Map();

  const rows = await prisma.lexeme.findMany({
    where: { lemma: { in: normalized } },
  });

  // Group by lemma, pick best source for each
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = grouped.get(row.lemma) ?? [];
    existing.push(row);
    grouped.set(row.lemma, existing);
  }

  const result = new Map<string, LexemeLookup>();

  for (const [lemma, entries] of grouped) {
    let freqRow: (typeof entries)[0] | undefined;
    for (const src of SOURCE_PRIORITY) {
      freqRow = entries.find((r) => r.source === src && r.freqPerMillion !== null);
      if (freqRow) break;
    }
    freqRow ??= entries[0];

    const cefrRow = entries.find((r) => r.cefr !== null);

    if (freqRow) {
      result.set(lemma, {
        lemma: freqRow.lemma,
        pos: freqRow.pos,
        freqPerMillion: freqRow.freqPerMillion,
        zipf: freqRow.zipf,
        cefr: cefrRow?.cefr ?? null,
        rank: freqRow.rank,
        source: freqRow.source,
      });
    }
  }

  return result;
}
