// splitSentences: splits a raw transcript string into sentence objects with character offsets

export interface TranscriptSentence {
  /** Sentence content, trimmed */
  text: string;
  /** Start character offset in the original string */
  start: number;
  /** End character offset in the original string (exclusive) */
  end: number;
  /** 0-based sentence index */
  index: number;
}

/**
 * Splits a transcript string into sentence objects with character offsets.
 *
 * Tokenizes on `.`, `!`, `?` boundaries (including trailing punctuation-free fragments).
 * Each result preserves the original `start`/`end` character positions for annotation
 * mapping and is assigned a 0-based `index`.
 *
 * @param text - Raw transcript string to split.
 * @returns An array of `TranscriptSentence` objects, or `[]` for blank input.
 * @example
 * splitSentences('Hello world. How are you?')
 * // => [{ text: 'Hello world.', start: 0, end: 12, index: 0 }, { text: 'How are you?', start: 13, end: 25, index: 1 }]
 */
export function splitSentences(text: string): TranscriptSentence[] {
  if (text.trim().length === 0) return [];

  const sentences: TranscriptSentence[] = [];
  const SENTENCE_REGEX = /[^.!?]+[.!?]+|[^.!?]+$/g;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = SENTENCE_REGEX.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();

    if (trimmed.length === 0) continue;

    const leadingWhitespace = raw.length - raw.trimStart().length;
    const start = match.index + leadingWhitespace;
    const end = match.index + raw.length;

    sentences.push({ text: trimmed, start, end, index });
    index++;
  }

  return sentences;
}
