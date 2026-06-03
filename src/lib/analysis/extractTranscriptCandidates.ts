// Extracts content words, collocation pairs, and MWE phrase candidates from a transcript

/** Content words extracted from a transcript, plus collocation pairs and MWE candidate phrases. */
export type TranscriptCandidates = {
  readonly contentWords: readonly string[];
  readonly pairs: ReadonlyArray<{ readonly head: string; readonly collocate: string }>;
  readonly phraseCandidates: readonly string[];
};

const MAX_PAIRS = 60;
const MAX_PHRASES = 80;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'can', 'could', 'may', 'might', 'must', 'i', 'you', 'he',
  'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my',
  'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'in', 'on', 'at', 'to',
  'from', 'by', 'with', 'of', 'about', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'up',
  'down', 'not', 'no', 'if', 'then', 'than', 'too', 'very', 'just',
  'also', 'more', 'most', 'other', 'some', 'any', 'all', 'both', 'each',
  'few', 'many', 'much', 'own', 'same', 'such', 'only', 'really', 'quite',
  'still', 'already', 'even', 'what', 'which', 'who', 'whom', 'whose',
  'when', 'where', 'why', 'how', 'there', 'here', 'am', 'oh', 'well',
  'like', 'know', 'think', 'going', 'got', 'get', 'go', 'went', 'come',
  'came', 'say', 'said', 'tell', 'told',
]);

function tokenize(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[.,!?;:()[\]"'‘’“”—–-]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function isContentWord(token: string): boolean {
  return !STOP_WORDS.has(token) && token.length > 1;
}

function extractPairs(
  contentWords: readonly string[],
): Array<{ head: string; collocate: string }> {
  const seen = new Set<string>();
  const pairs: Array<{ head: string; collocate: string }> = [];

  for (let i = 0; i < contentWords.length - 1 && pairs.length < MAX_PAIRS; i++) {
    const head = contentWords[i] ?? '';
    const collocate = contentWords[i + 1] ?? '';
    const key = `${head}::${collocate}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ head, collocate });
    }
  }

  return pairs;
}

function isAllStopWords(tokens: readonly string[]): boolean {
  return tokens.every((t) => STOP_WORDS.has(t));
}

function extractPhrases(tokens: readonly string[]): string[] {
  const seen = new Set<string>();
  const phrases: string[] = [];

  for (let n = 2; n <= 4 && phrases.length < MAX_PHRASES; n++) {
    for (let i = 0; i <= tokens.length - n && phrases.length < MAX_PHRASES; i++) {
      const ngram = tokens.slice(i, i + n);
      if (isAllStopWords(ngram)) continue;
      const phrase = ngram.join(' ');
      if (!seen.has(phrase)) {
        seen.add(phrase);
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

/**
 * Extracts lookup candidates from a transcript for corpus evidence building.
 *
 * Tokenizes, filters stop words for content words, creates adjacent-word
 * bigrams for collocation lookup, and generates 2-4 word ngrams for MWE attestation.
 *
 * @param transcript - Raw transcript text.
 * @returns Content words, adjacent content-word pairs, and 2-4 word ngram phrases.
 */
export function extractTranscriptCandidates(transcript: string): TranscriptCandidates {
  const tokens = tokenize(transcript);
  const contentWords = tokens.filter(isContentWord);

  return {
    contentWords,
    pairs: extractPairs(contentWords),
    phraseCandidates: extractPhrases(tokens),
  };
}
