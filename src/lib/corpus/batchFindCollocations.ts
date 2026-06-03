// Batch collocation lookup — single Prisma query for multiple word pairs
import { prisma } from '@/lib/prisma';
import type { CollocationLookup } from './corpus.types';

function pairKey(head: string, collocate: string): string {
  return `${head}::${collocate}`;
}

/**
 * Looks up multiple collocation pairs in a single Prisma query.
 *
 * Deduplicates and lowercases input pairs, groups results by pair,
 * and picks the highest-MI match per pair.
 *
 * @param pairs - Array of head/collocate pairs to look up.
 * @returns Map keyed by "head::collocate" with the best-MI match per pair.
 */
export async function batchFindCollocations(
  pairs: ReadonlyArray<{ readonly head: string; readonly collocate: string }>,
): Promise<Map<string, CollocationLookup>> {
  if (pairs.length === 0) return new Map();

  const seen = new Set<string>();
  const deduped: Array<{ headLemma: string; collocate: string }> = [];

  for (const p of pairs) {
    const h = p.head.toLowerCase();
    const c = p.collocate.toLowerCase();
    const k = pairKey(h, c);
    if (!seen.has(k)) {
      seen.add(k);
      deduped.push({ headLemma: h, collocate: c });
    }
  }

  const rows = await prisma.collocation.findMany({
    where: { OR: deduped },
  });

  const grouped = new Map<string, CollocationLookup>();

  for (const row of rows) {
    const k = pairKey(row.headLemma, row.collocate);
    const existing = grouped.get(k);
    if (existing === undefined || (row.mi ?? -Infinity) > (existing.mi ?? -Infinity)) {
      grouped.set(k, {
        headLemma: row.headLemma,
        collocate: row.collocate,
        attested: true,
        mi: row.mi,
        logDice: row.logDice,
        freq: row.freq,
        source: row.source,
      });
    }
  }

  return grouped;
}
