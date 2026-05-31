// Merges chunk transcripts by detecting and removing overlap duplicates via LCS word matching
export interface ChunkTranscriptInput {
  chunkIndex: number;
  text: string;
  overlapSecs: number;
}

/** Normalises a word for comparison: lowercase, strip punctuation */
function normalise(word: string): string {
  return word.toLowerCase().replace(/[^\w']/g, '');
}

/**
 * Finds the length of the longest suffix of `tail` that equals a prefix of `head`
 * (word-level comparison, case-insensitive, punctuation-stripped).
 * Scans from longest possible overlap down to 1.
 */
export function findOverlapLength(tail: string[], head: string[]): number {
  const maxLen = Math.min(tail.length, head.length, 15);

  for (let len = maxLen; len > 0; len -= 1) {
    const tailSlice = tail.slice(tail.length - len);
    const headSlice = head.slice(0, len);
    const allMatch = tailSlice.every(
      (word, i) => normalise(word) === normalise(headSlice[i] ?? ''),
    );
    if (allMatch) {
      return len;
    }
  }

  return 0;
}

/**
 * Given an ordered array of chunk transcripts, stitches them into a single
 * clean string by stripping the overlapping prefix from each subsequent chunk.
 */
export function stitchTranscripts(chunks: ChunkTranscriptInput[]): string {
  if (chunks.length === 0) {
    return '';
  }

  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  let merged: string[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const chunk = sorted[i];
    if (!chunk) {
      continue;
    }

    const words = chunk.text.trim().split(/\s+/).filter(Boolean);

    if (i === 0) {
      merged = words;
      continue;
    }

    const overlapLen = findOverlapLength(merged, words);
    const deduped = words.slice(overlapLen);
    merged.push(...deduped);
  }

  return merged.join(' ');
}
