// src/lib/eval/stats.ts
// Pure statistical functions for evaluating AI judge accuracy against human golden labels.
// No I/O, no Prisma — all functions take plain number arrays and return plain values.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BootstrapCI {
  lower: number;
  upper: number;
  nResamples: number;
}

export interface BootstrapOptions {
  nResamples?: number;
  seed?: number;
}

export interface MetricStats {
  metric: string;
  n: number;
  mae: number;
  maeCI: BootstrapCI;
  withinOne: number; // fraction 0..1
  withinOneCI: BootstrapCI;
  spearman: number | null; // null when n < 2
  spearmanCI: BootstrapCI | null;
  bandedQwk: number | null; // null when a band is empty (divide-by-zero guard)
  intraCeiling: number | null; // null when no isRetest pairs available
}

// ---------------------------------------------------------------------------
// Deterministic seeded PRNG (xorshift32)
// Produces values in [0, 1) — drop-in replacement for Math.random()
// ---------------------------------------------------------------------------

/** Returns a stateful PRNG function seeded with `seed`. */
export function makeSeededRandom(seed: number): () => number {
  // xorshift32 — period 2^32-1, passes basic randomness tests.
  // State 0 is a fixed point and must be avoided.
  let state = seed >>> 0;
  if (state === 0) state = 1;
  return function (): number {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0; // keep unsigned 32-bit
    return state / 0x100000000; // normalize to [0, 1)
  };
}

// ---------------------------------------------------------------------------
// MAE
// ---------------------------------------------------------------------------

/**
 * Mean absolute error between paired score arrays.
 * @throws if arrays have different lengths or are empty.
 */
export function computeMAE(human: readonly number[], ai: readonly number[]): number {
  if (human.length !== ai.length) {
    throw new Error(`computeMAE: array length mismatch (${human.length} vs ${ai.length})`);
  }
  if (human.length === 0) {
    throw new Error('computeMAE: empty arrays');
  }
  let sum = 0;
  for (let i = 0; i < human.length; i++) {
    const h = human[i];
    const a = ai[i];
    if (h === undefined || a === undefined) continue;
    sum += Math.abs(h - a);
  }
  return sum / human.length;
}

// ---------------------------------------------------------------------------
// Within-1 accuracy
// ---------------------------------------------------------------------------

/**
 * Fraction of pairs where |human - ai| <= 1.
 * Returns a value in [0, 1].
 */
export function computeWithinOne(human: readonly number[], ai: readonly number[]): number {
  if (human.length !== ai.length || human.length === 0) {
    throw new Error('computeWithinOne: mismatched or empty arrays');
  }
  let hits = 0;
  for (let i = 0; i < human.length; i++) {
    const h = human[i];
    const a = ai[i];
    if (h === undefined || a === undefined) continue;
    if (Math.abs(h - a) <= 1) hits++;
  }
  return hits / human.length;
}

// ---------------------------------------------------------------------------
// Spearman rank correlation
// ---------------------------------------------------------------------------

function rankArray(arr: readonly number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    const iEntry = indexed[i];
    if (iEntry === undefined) break;
    while (j < indexed.length && (indexed[j]?.v ?? 0) === iEntry.v) j++;
    const avgRank = (i + j - 1) / 2;
    for (let k = i; k < j; k++) {
      const entry = indexed[k];
      if (entry === undefined) continue;
      ranks[entry.i] = avgRank;
    }
    i = j;
  }
  return ranks;
}

/**
 * Spearman rank-order correlation.
 * Returns null when n < 2 or variance is zero (undefined).
 */
export function computeSpearman(human: readonly number[], ai: readonly number[]): number | null {
  if (human.length !== ai.length) {
    throw new Error('computeSpearman: array length mismatch');
  }
  if (human.length < 2) return null;

  const rh = rankArray(human);
  const ra = rankArray(ai);
  const n = rh.length;
  const meanR = (n - 1) / 2;

  let cov = 0;
  let varH = 0;
  let varA = 0;
  for (let i = 0; i < n; i++) {
    const rhi = rh[i];
    const rai = ra[i];
    if (rhi === undefined || rai === undefined) continue;
    const dh = rhi - meanR;
    const da = rai - meanR;
    cov += dh * da;
    varH += dh * dh;
    varA += da * da;
  }
  const denom = Math.sqrt(varH * varA);
  if (denom === 0) return null;
  return cov / denom;
}

// ---------------------------------------------------------------------------
// Banded QWK helpers — split to stay under complexity limit
// ---------------------------------------------------------------------------

const N_BANDS = 4;

/**
 * Collapses a 1-10 score into one of 4 bands.
 * Band 0: 1-2  | Band 1: 3-5  | Band 2: 6-8  | Band 3: 9-10
 */
export function scoreToBand(score: number): 0 | 1 | 2 | 3 {
  if (score <= 2) return 0;
  if (score <= 5) return 1;
  if (score <= 8) return 2;
  return 3;
}

/** Builds confusion matrix O[humanBand][aiBand] from two parallel band arrays. */
function buildConfusionMatrix(humanBands: (0|1|2|3)[], aiBands: (0|1|2|3)[]): number[][] {
  const O: number[][] = Array.from({ length: N_BANDS }, () =>
    new Array<number>(N_BANDS).fill(0),
  );
  for (let i = 0; i < humanBands.length; i++) {
    const hb = humanBands[i];
    const ab = aiBands[i];
    if (hb === undefined || ab === undefined) continue;
    const row = O[hb];
    if (row === undefined) continue;
    row[ab] = (row[ab] ?? 0) + 1;
  }
  return O;
}

/** Computes row/column marginals from a confusion matrix. */
function computeMarginals(O: number[][]): { humanMarginal: number[]; aiMarginal: number[] } {
  const humanMarginal = new Array<number>(N_BANDS).fill(0);
  const aiMarginal = new Array<number>(N_BANDS).fill(0);
  for (let h = 0; h < N_BANDS; h++) {
    for (let a = 0; a < N_BANDS; a++) {
      const cell = O[h]?.[a] ?? 0;
      humanMarginal[h] = (humanMarginal[h] ?? 0) + cell;
      aiMarginal[a] = (aiMarginal[a] ?? 0) + cell;
    }
  }
  return { humanMarginal, aiMarginal };
}

/** Computes QWK numerator and denominator from O, E, and W matrices. */
function qwkWeightedSums(
  O: number[][],
  E: number[][],
  W: number[][],
): { numerator: number; denominator: number } {
  let numerator = 0;
  let denominator = 0;
  for (let h = 0; h < N_BANDS; h++) {
    for (let a = 0; a < N_BANDS; a++) {
      const w = W[h]?.[a] ?? 0;
      numerator += w * (O[h]?.[a] ?? 0);
      denominator += w * (E[h]?.[a] ?? 0);
    }
  }
  return { numerator, denominator };
}

// ---------------------------------------------------------------------------
// Banded QWK (quadratic weighted kappa)
// ---------------------------------------------------------------------------

/**
 * Banded quadratic weighted kappa collapsed to 4 bands (scores 1-10 → bands 0-3).
 *
 * Returns null (not NaN) when any band is completely absent from either
 * the human or AI marginal distribution — the expected matrix denominator
 * would otherwise be zero, producing NaN. Callers must treat null as
 * "insufficient data for this band configuration", not as agreement=0.
 */
export function computeBandedQwk(
  human: readonly number[],
  ai: readonly number[],
): number | null {
  if (human.length !== ai.length || human.length === 0) {
    throw new Error('computeBandedQwk: mismatched or empty arrays');
  }

  const n = human.length;
  const humanBands = human.map(scoreToBand);
  const aiBands = ai.map(scoreToBand);
  const O = buildConfusionMatrix(humanBands, aiBands);
  const { humanMarginal, aiMarginal } = computeMarginals(O);

  // Guard: empty marginal → denominator would be zero → NaN
  if (humanMarginal.some((m) => m === 0) || aiMarginal.some((m) => m === 0)) {
    return null;
  }

  const maxDiff = (N_BANDS - 1) ** 2;
  const W: number[][] = Array.from({ length: N_BANDS }, (_, i) =>
    Array.from({ length: N_BANDS }, (__, j) => ((i - j) ** 2) / maxDiff),
  );
  const E: number[][] = Array.from({ length: N_BANDS }, (_, h) =>
    Array.from({ length: N_BANDS }, (__, a) =>
      ((humanMarginal[h] ?? 0) * (aiMarginal[a] ?? 0)) / n,
    ),
  );

  const { numerator, denominator } = qwkWeightedSums(O, E, W);

  // Floating-point near-zero guard
  if (denominator < 1e-10) return null;
  return 1 - numerator / denominator;
}

// ---------------------------------------------------------------------------
// Bootstrap confidence intervals
// ---------------------------------------------------------------------------

type StatFn = (human: readonly number[], ai: readonly number[]) => number | null;

/**
 * Bootstrap 95% CI for a paired stat function.
 *
 * Uses a seeded PRNG (xorshift32) — output is fully deterministic for a given seed.
 * Only non-null resample values are included; nResamples reflects the actual count.
 *
 * @param human   - Human scores
 * @param ai      - Paired AI scores
 * @param fn      - Pure stat function returning number | null
 * @param options - { nResamples?: number (default 1000), seed?: number (default 42) }
 */
export function bootstrapCI(
  human: readonly number[],
  ai: readonly number[],
  fn: StatFn,
  options: BootstrapOptions = {},
): BootstrapCI {
  const { nResamples = 1000, seed = 42 } = options;
  const rand = makeSeededRandom(seed);
  const n = human.length;
  const stats: number[] = [];

  for (let r = 0; r < nResamples; r++) {
    const resampledHuman: number[] = [];
    const resampledAi: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rand() * n);
      const h = human[idx];
      const a = ai[idx];
      if (h === undefined || a === undefined) continue;
      resampledHuman.push(h);
      resampledAi.push(a);
    }
    const s = fn(resampledHuman, resampledAi);
    if (s !== null) stats.push(s);
  }

  stats.sort((a, b) => a - b);
  const lo = Math.floor(stats.length * 0.025);
  const hi = Math.floor(stats.length * 0.975);

  return {
    lower: stats[lo] ?? 0,
    upper: stats[hi] ?? 0,
    nResamples: stats.length,
  };
}

// ---------------------------------------------------------------------------
// Intra-rater MAE ceiling
// ---------------------------------------------------------------------------

/**
 * Computes MAE between pairs of human ratings for the same session
 * where `isRetest === true`. This is the human-noise ceiling: AI error
 * below this ceiling is indistinguishable from human variability.
 *
 * Returns null when fewer than 2 retest pairs are available.
 */
export function computeIntraRaterCeiling(
  pairs: ReadonlyArray<{ firstScore: number; retestScore: number }>,
): number | null {
  if (pairs.length < 2) return null;
  const diffs = pairs.map((p) => Math.abs(p.firstScore - p.retestScore));
  return diffs.reduce((s, d) => s + d, 0) / diffs.length;
}
