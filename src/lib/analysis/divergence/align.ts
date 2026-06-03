// Levenshtein-based word alignment between normalized and verbatim transcripts.
import type { AlignmentOp } from './divergence.types';

type Cell = { i: number; j: number };

/** Lowercases and strips surrounding punctuation for comparison only. */
function normalizeForCompare(token: string): string {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** Safe matrix read — out-of-bounds returns Infinity so it is never the chosen min. */
function at(dp: number[][], i: number, j: number): number {
  return dp[i]?.[j] ?? Number.POSITIVE_INFINITY;
}

/** Builds the edit-distance cost matrix between two token arrays. */
function buildCostMatrix(normalized: string[], verbatim: string[]): number[][] {
  const rows = normalized.length;
  const cols = verbatim.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));

  for (let i = 0; i <= rows; i++) {
    const r = dp[i];
    if (r) r[0] = i;
  }
  const top = dp[0];
  if (top) for (let j = 0; j <= cols; j++) top[j] = j;

  for (let i = 1; i <= rows; i++) {
    const row = dp[i];
    if (!row) continue;
    for (let j = 1; j <= cols; j++) {
      const equal = normalizeForCompare(normalized[i - 1] ?? '') === normalizeForCompare(verbatim[j - 1] ?? '');
      const subCost = at(dp, i - 1, j - 1) + (equal ? 0 : 1);
      row[j] = Math.min(subCost, at(dp, i - 1, j) + 1, at(dp, i, j - 1) + 1);
    }
  }
  return dp;
}

/** One backtrace step — returns the op and the previous cell. */
function stepBack(dp: number[][], normalized: string[], verbatim: string[], cell: Cell): { op: AlignmentOp; cell: Cell } {
  const { i, j } = cell;
  const n = i > 0 ? normalized[i - 1] ?? null : null;
  const v = j > 0 ? verbatim[j - 1] ?? null : null;
  const equal = n !== null && v !== null && normalizeForCompare(n) === normalizeForCompare(v);
  const cur = at(dp, i, j);

  if (i > 0 && j > 0 && cur === at(dp, i - 1, j - 1) + (equal ? 0 : 1)) {
    const type = equal ? 'match' : 'substitution';
    return { op: { type, verbatimIndex: j - 1, normalizedIndex: i - 1, verbatimToken: v, normalizedToken: n }, cell: { i: i - 1, j: j - 1 } };
  }
  if (j > 0 && (i === 0 || cur === at(dp, i, j - 1) + 1)) {
    return { op: { type: 'insertion', verbatimIndex: j - 1, normalizedIndex: null, verbatimToken: v, normalizedToken: null }, cell: { i, j: j - 1 } };
  }
  return { op: { type: 'deletion', verbatimIndex: null, normalizedIndex: i - 1, verbatimToken: null, normalizedToken: n }, cell: { i: i - 1, j } };
}

/**
 * Aligns two token arrays via edit-distance DP and returns the optimal op sequence.
 *
 * @param normalized - tokens from the Whisper (normalized) transcript
 * @param verbatim - tokens from the AssemblyAI (verbatim) transcript
 * @returns ordered alignment ops, source order (first token first)
 */
export function alignTranscripts(normalized: string[], verbatim: string[]): AlignmentOp[] {
  const dp = buildCostMatrix(normalized, verbatim);
  const ops: AlignmentOp[] = [];
  let cell: Cell = { i: normalized.length, j: verbatim.length };

  while (cell.i > 0 || cell.j > 0) {
    const next = stepBack(dp, normalized, verbatim, cell);
    ops.push(next.op);
    cell = next.cell;
  }
  return ops.reverse();
}
