// Deduplicates overlapping Whisper word timestamps at chunked recording boundaries
export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w']/g, '');
}

function findLongestOverlap(
  previousTail: TranscriptWord[],
  nextHead: TranscriptWord[],
): number {
  const maxLength = Math.min(previousTail.length, nextHead.length);
  let bestOverlap = 0;

  for (let overlapLength = maxLength; overlapLength > 0; overlapLength -= 1) {
    const tailSlice = previousTail.slice(previousTail.length - overlapLength);
    const headSlice = nextHead.slice(0, overlapLength);
    const matches = tailSlice.every(
      (word, index) =>
        normalizeWord(word.word) === normalizeWord(headSlice[index]?.word ?? ''),
    );

    if (matches) {
      bestOverlap = overlapLength;
      break;
    }
  }

  return bestOverlap;
}

/** Removes duplicated prefix words from the next chunk using overlap duration. */
export function deduplicateChunkWords(
  previousWords: TranscriptWord[],
  nextWords: TranscriptWord[],
  overlapSecs: number,
): TranscriptWord[] {
  if (previousWords.length === 0 || nextWords.length === 0) {
    return nextWords;
  }

  const firstNonOverlapIndex = nextWords.findIndex((word) => word.start > overlapSecs);
  const candidateHead =
    firstNonOverlapIndex === -1 ? nextWords : nextWords.slice(firstNonOverlapIndex);

  const previousTail = previousWords.slice(-candidateHead.length);
  const overlapLength = findLongestOverlap(previousTail, candidateHead);

  if (overlapLength === 0) {
    return candidateHead;
  }

  return candidateHead.slice(overlapLength);
}

/** Concatenates chunk word arrays into one unified transcript with overlap dedup. */
export function concatenateChunkTranscripts(
  chunks: Array<{ words: TranscriptWord[]; overlapSecs: number }>,
): { text: string; words: TranscriptWord[] } {
  if (chunks.length === 0) {
    return { text: '', words: [] };
  }

  const mergedWords: TranscriptWord[] = [...(chunks[0]?.words ?? [])];

  for (let index = 1; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (!chunk) {
      continue;
    }

    const deduped = deduplicateChunkWords(
      mergedWords,
      chunk.words,
      chunk.overlapSecs,
    );
    mergedWords.push(...deduped);
  }

  const text = mergedWords.map((word) => word.word).join(' ').trim();
  return { text, words: mergedWords };
}

/** Builds plain text from words when only transcript strings are available. */
export function concatenateChunkTexts(
  chunks: Array<{ transcriptText: string; overlapSecs: number; words?: TranscriptWord[] }>,
): string {
  const wordChunks = chunks.map((chunk) => ({
    words:
      chunk.words ??
      chunk.transcriptText
        .split(/\s+/)
        .filter(Boolean)
        .map((word, index) => ({ word, start: index, end: index + 1 })),
    overlapSecs: chunk.overlapSecs,
  }));

  return concatenateChunkTranscripts(wordChunks).text;
}
