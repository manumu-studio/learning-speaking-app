// Post-processes Claude analysis output to remove false-positive flags on proper nouns and tech terms
import nlp from 'compromise';
import type { Insight } from '@/lib/ai/analyze';
import type { FilterResult } from '@/lib/ai/nerFilter.types';

const FREQUENCY_FLOOR = 2;
const TECH_TERM_MIN_LENGTH = 8;

function countWordOccurrences(transcript: string, word: string): number {
  const normalized = word.toLowerCase().trim();
  if (normalized.length === 0) {
    return 0;
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = transcript.toLowerCase().match(new RegExp(`\\b${escaped}\\b`, 'g'));
  return matches?.length ?? 0;
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === 'string');
}

function extractEntityTerms(transcript: string): Set<string> {
  const doc = nlp(transcript);
  const terms = new Set<string>();

  const properRaw: unknown = doc.match('#ProperNoun').out('array');
  for (const term of parseStringArray(properRaw)) {
    terms.add(term.toLowerCase());
  }

  const acronymRaw: unknown = doc.match('#Acronym').out('array');
  for (const term of parseStringArray(acronymRaw)) {
    terms.add(term.toLowerCase());
  }

  return terms;
}

function appearsAsCapitalizedTerm(transcript: string, word: string): boolean {
  if (!/^[A-Z]/.test(word)) {
    return false;
  }
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(transcript);
}

function isTechTermShape(word: string): boolean {
  if (word.length < TECH_TERM_MIN_LENGTH) {
    return false;
  }
  const hasInternalCapital = /[a-z][A-Z]/.test(word) || /^[A-Z][a-z]+[A-Z]/.test(word);
  return hasInternalCapital;
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'been',
  'were',
  'was',
  'are',
  'you',
  'your',
  'our',
  'their',
  'they',
  'she',
  'him',
  'her',
  'his',
  'its',
  'not',
  'but',
  'can',
  'will',
  'would',
  'could',
  'should',
  'into',
  'about',
  'when',
  'where',
  'what',
  'which',
  'who',
  'how',
  'why',
  'subject',
  'verb',
  'agreement',
  'tense',
  'past',
  'missing',
  'overuse',
  'instead',
  'often',
  'there',
  'here',
  'work',
  'home',
]);

function extractCandidateWords(insight: Insight): string[] {
  const candidates = new Set<string>();

  if (insight.examples != null) {
    for (const example of insight.examples) {
      const tokens = example.split(/\s+/);
      for (const token of tokens) {
        const cleaned = token.replace(/[^a-zA-Z0-9]/g, '');
        const lower = cleaned.toLowerCase();
        if (cleaned.length > 2 && !STOPWORDS.has(lower)) {
          candidates.add(cleaned);
        }
      }
    }
  }

  return [...candidates].filter((w) => w.length > 0);
}

function getFilterReason(
  insight: Insight,
  transcript: string,
  entityTerms: Set<string>
): string | null {
  const candidates = extractCandidateWords(insight);

  for (const word of candidates) {
    const lower = word.toLowerCase();

    if (entityTerms.has(lower)) {
      return `proper noun or acronym: ${word}`;
    }

    if (appearsAsCapitalizedTerm(transcript, word)) {
      return `capitalized proper noun in transcript: ${word}`;
    }

    if (isTechTermShape(word)) {
      return `tech term shape: ${word}`;
    }
  }

  if (candidates.length > 0) {
    const maxOccurrences = Math.max(
      ...candidates.map((word) => countWordOccurrences(transcript, word)),
    );
    if (maxOccurrences < FREQUENCY_FLOOR) {
      return `no example token appears at least ${FREQUENCY_FLOOR} times in transcript`;
    }
  }

  const frequency = insight.frequency ?? 0;
  if (frequency > 0 && frequency < FREQUENCY_FLOOR) {
    return `insight frequency below ${FREQUENCY_FLOOR}`;
  }

  return null;
}

/** Removes insights that reference proper nouns, acronyms, or low-frequency words that are likely transcription artefacts. */
export function filterTranscriptionArtefacts(
  insights: Insight[],
  fullTranscript: string
): FilterResult {
  const entityTerms = extractEntityTerms(fullTranscript);
  const kept: Insight[] = [];
  const filtered: Insight[] = [];
  const filterReasons: Array<{ word: string; reason: string }> = [];

  for (const insight of insights) {
    const reason = getFilterReason(insight, fullTranscript, entityTerms);
    if (reason != null) {
      filtered.push(insight);
      const word = extractCandidateWords(insight)[0] ?? insight.pattern;
      filterReasons.push({ word, reason });
    } else {
      kept.push(insight);
    }
  }

  return { kept, filtered, filterReasons };
}
