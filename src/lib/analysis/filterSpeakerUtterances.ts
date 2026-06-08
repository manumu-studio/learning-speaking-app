// Heuristic speaker filtering — removes AI coach speech from verbatim transcripts.
import type { VerbatimWord } from '@/lib/assemblyai/transcribe';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FilteredVerbatim {
  readonly text: string;
  readonly words: ReadonlyArray<VerbatimWord>;
  readonly wordCount: number;
  readonly removedWordCount: number;
  readonly filterMethod: 'heuristic' | 'none';
}

// ---------------------------------------------------------------------------
// Coach phrase patterns (case-insensitive, matched against lowered text)
// ---------------------------------------------------------------------------

const OPENING_PATTERNS = [
  'go ahead',
  "whenever you're ready",
  "whenever you are ready",
  "let's begin",
  'start when',
  'you can start',
  'you may begin',
  'take your time',
  'begin whenever',
] as const;

const CLOSING_PATTERNS = [
  'quick assessment',
  'really solid',
  'great job',
  'let me give you',
  'before we wrap',
  'excellent work',
  'nice work',
  'good work',
  'well done',
  "let's wrap",
  'overall feedback',
  'feedback for you',
  'some feedback',
  'my feedback',
  "here's what i noticed",
  "here is what i noticed",
] as const;

const MID_SESSION_PATTERNS = [
  'can you elaborate',
  'tell me more',
  'interesting point',
  'could you expand',
  'what do you mean',
  'go on',
  'please continue',
  'that is interesting',
  "that's interesting",
] as const;

const ALL_PATTERNS = [
  ...OPENING_PATTERNS,
  ...CLOSING_PATTERNS,
  ...MID_SESSION_PATTERNS,
];

// ---------------------------------------------------------------------------
// Utterance block segmentation — splits on silence gaps ≥ SILENCE_GAP_MS
// ---------------------------------------------------------------------------

const SILENCE_GAP_MS = 2000;
const MAX_COACH_UTTERANCE_WORDS = 15;

interface UtteranceBlock {
  readonly words: VerbatimWord[];
  readonly text: string;
  readonly startIdx: number;
  readonly endIdx: number;
}

function segmentIntoBlocks(words: ReadonlyArray<VerbatimWord>): UtteranceBlock[] {
  if (words.length === 0) return [];

  const blocks: UtteranceBlock[] = [];
  let blockStart = 0;

  for (let i = 1; i < words.length; i++) {
    const gap = words[i]!.start - words[i - 1]!.end;
    if (gap >= SILENCE_GAP_MS) {
      blocks.push(buildBlock(words, blockStart, i));
      blockStart = i;
    }
  }

  blocks.push(buildBlock(words, blockStart, words.length));
  return blocks;
}

function buildBlock(
  words: ReadonlyArray<VerbatimWord>,
  start: number,
  end: number,
): UtteranceBlock {
  const slice = words.slice(start, end);
  return {
    words: slice,
    text: slice.map(w => w.text).join(' '),
    startIdx: start,
    endIdx: end,
  };
}

// ---------------------------------------------------------------------------
// Classification — conservative: uncertain blocks are kept
// ---------------------------------------------------------------------------

function isCoachBlock(block: UtteranceBlock): boolean {
  if (block.words.length > MAX_COACH_UTTERANCE_WORDS) return false;

  const lower = block.text.toLowerCase();
  return ALL_PATTERNS.some(pattern => lower.includes(pattern));
}

// ---------------------------------------------------------------------------
// Text-only heuristic fallback (when words array is null)
// ---------------------------------------------------------------------------

function filterTextOnly(text: string): { filtered: string; removedCount: number } {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  let removedWordCount = 0;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;

    if (wordCount <= MAX_COACH_UTTERANCE_WORDS && ALL_PATTERNS.some(p => lower.includes(p))) {
      removedWordCount += wordCount;
    } else {
      kept.push(sentence);
    }
  }

  return { filtered: kept.join(' '), removedCount: removedWordCount };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function filterSpeakerUtterances(
  verbatimText: string,
  verbatimWords: ReadonlyArray<VerbatimWord> | null,
): FilteredVerbatim {
  if (!verbatimText.trim()) {
    return {
      text: '',
      words: [],
      wordCount: 0,
      removedWordCount: 0,
      filterMethod: 'none',
    };
  }

  if (!verbatimWords || verbatimWords.length === 0) {
    const { filtered, removedCount } = filterTextOnly(verbatimText);
    const wordCount = filtered.split(/\s+/).filter(Boolean).length;
    return {
      text: filtered,
      words: [],
      wordCount,
      removedWordCount: removedCount,
      filterMethod: removedCount > 0 ? 'heuristic' : 'none',
    };
  }

  const blocks = segmentIntoBlocks(verbatimWords);
  const keptWords: VerbatimWord[] = [];
  let removedWordCount = 0;

  for (const block of blocks) {
    if (isCoachBlock(block)) {
      removedWordCount += block.words.length;
    } else {
      keptWords.push(...block.words);
    }
  }

  const filteredText = keptWords.map(w => w.text).join(' ');

  return {
    text: filteredText,
    words: keptWords,
    wordCount: keptWords.length,
    removedWordCount,
    filterMethod: removedWordCount > 0 ? 'heuristic' : 'none',
  };
}
