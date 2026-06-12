// Deterministic filler count from verbatim transcript — source of truth for fillerUsage metric.

// ---------------------------------------------------------------------------
// Filler lexicon
// ---------------------------------------------------------------------------

const SINGLE_WORD_FILLERS = [
  'uh', 'um', 'eh', 'er', 'ah', 'hm', 'hmm', 'erm',
] as const;

const MULTI_WORD_FILLERS = [
  'you know', 'i mean', 'sort of', 'kind of',
] as const;

function isSingleWordFiller(word: string): word is typeof SINGLE_WORD_FILLERS[number] {
  return (SINGLE_WORD_FILLERS as readonly string[]).includes(word);
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FillerCountResult {
  readonly fillerCount: number;
  readonly totalWords: number;
  readonly fillerDensityPercent: number;
  readonly score: number;
  readonly level: string;
  readonly note: string;
  readonly topFillers: ReadonlyArray<{ word: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Score / level mapping
// ---------------------------------------------------------------------------

const DENSITY_THRESHOLDS = [1, 2, 3, 4, 5, 6, 8, 10, 15] as const;

function densityToScore(percent: number): number {
  const idx = DENSITY_THRESHOLDS.findIndex((t) => percent <= t);
  return idx === -1 ? 1 : 10 - idx;
}

function scoreToLevel(score: number): string {
  if (score >= 9) return 'excellent';
  if (score >= 7) return 'good';
  if (score >= 5) return 'developing';
  if (score >= 3) return 'needs_work';
  return 'critical';
}

// ---------------------------------------------------------------------------
// Counting helpers (extracted to keep main function under complexity limit)
// ---------------------------------------------------------------------------

function countSingleWordFillers(words: string[], counts: Map<string, number>): void {
  for (const filler of SINGLE_WORD_FILLERS) {
    let c = 0;
    for (const w of words) {
      const stripped = w.replace(/[.,!?]$/, '');
      if (stripped === filler) c++;
    }
    if (c > 0) counts.set(filler, c);
  }
}

function countMultiWordFillers(words: string[], counts: Map<string, number>): void {
  for (const phrase of MULTI_WORD_FILLERS) {
    let c = 0;
    const parts = phrase.split(' ');
    for (let i = 0; i <= words.length - parts.length; i++) {
      const first = words[i]?.replace(/[.,!?]$/, '') ?? '';
      const second = words[i + 1]?.replace(/[.,!?]$/, '') ?? '';
      if (first === parts[0] && second === parts[1]) c++;
    }
    if (c > 0) counts.set(phrase, c);
  }
}

function countFillerLike(words: string[]): number {
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    if (words[i] !== 'like') continue;
    if (i === 0) { count++; continue; }
    const prev = words[i - 1] ?? '';
    const isAfterPause = prev.endsWith(',') || prev === '';
    const isAfterFiller = isSingleWordFiller(prev.replace(/[.,!?]$/, ''));
    if (isAfterPause || isAfterFiller) count++;
  }
  return count;
}

function buildNote(fillerCount: number, totalWords: number, density: number, topFillers: ReadonlyArray<{ word: string; count: number }>): string {
  if (fillerCount === 0) return 'No fillers detected in verbatim transcript';
  const topSummary = topFillers.slice(0, 3).map((f) => `${f.word} (${f.count})`).join(', ');
  return `${density.toFixed(1)}% filler density (${fillerCount} fillers / ${totalWords} words). Top: ${topSummary}`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function countVerbatimFillers(filteredVerbatimText: string): FillerCountResult {
  const words = filteredVerbatimText.toLowerCase().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) {
    return { fillerCount: 0, totalWords: 0, fillerDensityPercent: 0, score: 10, level: 'excellent', note: 'No speech to analyze', topFillers: [] };
  }

  const counts = new Map<string, number>();
  countSingleWordFillers(words, counts);
  countMultiWordFillers(words, counts);

  const likeCount = countFillerLike(words);
  if (likeCount > 0) counts.set('like', likeCount);

  let fillerCount = 0;
  for (const c of counts.values()) fillerCount += c;

  const fillerDensityPercent = (fillerCount / totalWords) * 100;
  const score = densityToScore(fillerDensityPercent);
  const level = scoreToLevel(score);
  const topFillers = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word, count]) => ({ word, count }));
  const note = buildNote(fillerCount, totalWords, fillerDensityPercent, topFillers);

  return { fillerCount, totalWords, fillerDensityPercent, score, level, note, topFillers };
}
