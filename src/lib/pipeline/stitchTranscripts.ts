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
 * Finds the length of the longest suffix of `tail` that matches a prefix of `head`
 * at the word level (case-insensitive, punctuation stripped, capped at 15 words).
 *
 * Used to detect and remove overlapping transcript text at chunk boundaries.
 *
 * @param tail - Word array representing the end of the previously accumulated transcript.
 * @param head - Word array representing the start of the next chunk.
 * @returns The number of overlapping words (0 if no overlap found).
 * @example
 * findOverlapLength(['hello', 'world'], ['world', 'foo']) // => 1
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
 * Stitches an ordered array of chunk transcripts into a single clean string
 * by detecting and removing the overlapping prefix from each subsequent chunk.
 *
 * Chunks are sorted by `chunkIndex` before stitching so insertion order does not matter.
 * Returns an empty string for an empty input array.
 *
 * @param chunks - Chunk transcript objects with `chunkIndex`, `text`, and `overlapSecs`.
 * @returns The full session transcript as a single space-separated string.
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
