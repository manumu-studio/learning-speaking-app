// Look up a word pair in the collocation tables
import { prisma } from '@/lib/prisma';
import type { CollocationLookup } from './corpus.types';

/** Look up a word pair in the ACL/COCA collocation tables — returns MI score and attestation. */
export async function findCollocation(
  head: string,
  collocate: string,
): Promise<CollocationLookup | null> {
  const row = await prisma.collocation.findFirst({
    where: {
      headLemma: head.toLowerCase(),
      collocate: collocate.toLowerCase(),
    },
    orderBy: { mi: 'desc' },
  });

  if (!row) return null;

  return {
    headLemma: row.headLemma,
    collocate: row.collocate,
    attested: true,
    mi: row.mi,
    logDice: row.logDice,
    freq: row.freq,
    source: row.source,
  };
}
