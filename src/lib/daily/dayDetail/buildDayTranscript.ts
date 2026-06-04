// Builds transcript modes for day-detail meta-session sessions
import type { DayTranscriptData, DayTranscriptMode, DayTranscriptToken } from './buildDayDetailData.types';

const TOKEN_PATTERN = /(\r\n|\n|\s+|[\p{L}\p{N}'-]+|[^\s\p{L}\p{N}'-]+)/gu;

type TranscriptScoreBand = 'green' | 'amber' | 'red' | 'grayItalic';

export interface DayTranscriptWordInput {
  readonly display: string | null;
  readonly word: string;
  readonly accuracyScore: number;
  readonly errorType: string;
  readonly wordIndex: number;
  readonly phonemes: unknown;
  readonly l1Tags: readonly string[];
  readonly breakErrorTypes: readonly string[];
  readonly intonationErrorTypes: readonly string[];
  readonly monotonePitchDelta: number | null;
}

export interface DayTranscriptSessionInput {
  readonly id: string;
  readonly createdAt: Date;
  readonly intentLabel: string | null;
  readonly topic: string | null;
  readonly promptUsed: string | null;
  readonly transcript: {
    readonly text: string;
    readonly improvedText: string | null;
    readonly wordCount: number | null;
  } | null;
  readonly pronunciationWords: readonly DayTranscriptWordInput[];
}

export interface BuildDayTranscriptInput {
  readonly sessions: readonly DayTranscriptSessionInput[];
}

function normalizeWord(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');
}

function tokenKind(text: string): DayTranscriptToken['kind'] {
  if (text === '\n' || text === '\r\n') return 'lineBreak';
  if (/^\s+$/u.test(text)) return 'space';
  if (normalizeWord(text).length > 0) return 'word';
  return 'punctuation';
}

function scoreBand(word: DayTranscriptWordInput): TranscriptScoreBand {
  if (word.errorType === 'Insertion') return 'grayItalic';
  if (word.errorType === 'Omission' || word.accuracyScore < 60) return 'red';
  if (word.accuracyScore < 85) return 'amber';
  return 'green';
}

function pronunciationFor(
  token: string,
  words: readonly DayTranscriptWordInput[],
  cursor: number,
): { pronunciation: DayTranscriptToken['pronunciation']; nextCursor: number } {
  const normalized = normalizeWord(token);
  if (normalized.length === 0) return { pronunciation: null, nextCursor: cursor };
  const current = words[cursor];
  if (current === undefined) return { pronunciation: null, nextCursor: cursor };
  const currentText = normalizeWord(current.display ?? current.word);
  const nextCursor = cursor + 1;
  return {
    pronunciation: currentText === normalized
      ? {
          display: current.display,
          accuracyScore: current.accuracyScore,
          errorType: current.errorType,
          wordIndex: current.wordIndex,
          scoreBand: scoreBand(current),
          phonemes: current.phonemes,
          l1Tags: [...current.l1Tags],
          breakErrorTypes: [...current.breakErrorTypes],
          intonationErrorTypes: [...current.intonationErrorTypes],
          monotonePitchDelta: current.monotonePitchDelta,
        }
      : null,
    nextCursor,
  };
}

function tokenize(text: string, words: readonly DayTranscriptWordInput[]): DayTranscriptToken[] {
  const rawTokens = text.match(TOKEN_PATTERN) ?? [];
  let cursor = 0;
  return rawTokens.map((textToken) => {
    const kind = tokenKind(textToken);
    const result = kind === 'word'
      ? pronunciationFor(textToken, words, cursor)
      : { pronunciation: null, nextCursor: cursor };
    cursor = result.nextCursor;
    return {
      text: textToken,
      kind,
      pronunciation: result.pronunciation,
    };
  });
}

function titleFor(sessionNumber: number): string {
  return `Session ${sessionNumber}`;
}

function topicFor(session: DayTranscriptSessionInput): string {
  return session.intentLabel ?? session.topic ?? session.promptUsed ?? 'Speaking practice';
}

interface TranscriptModeInput {
  readonly kind: DayTranscriptMode['kind'];
  readonly label: string;
  readonly text: string;
  readonly words: readonly DayTranscriptWordInput[];
  readonly wordCount: number | null;
}

function mode(input: TranscriptModeInput): DayTranscriptMode {
  return {
    kind: input.kind,
    label: input.label,
    text: input.text,
    tokens: tokenize(input.text, input.kind === 'pronunciationMap' ? input.words : []),
    wordCount: input.wordCount,
  };
}

function modesFor(session: DayTranscriptSessionInput): DayTranscriptMode[] {
  const transcript = session.transcript;
  if (transcript === null || transcript.text.trim().length === 0) return [];
  const modes: DayTranscriptMode[] = [];
  if (session.pronunciationWords.length > 0) {
    modes.push(mode({
      kind: 'pronunciationMap',
      label: 'Pronunciation map',
      text: transcript.text,
      words: session.pronunciationWords,
      wordCount: transcript.wordCount,
    }));
  }
  modes.push(mode({
    kind: 'yourWords',
    label: 'Your words',
    text: transcript.text,
    words: [],
    wordCount: transcript.wordCount,
  }));
  if (transcript.improvedText !== null && transcript.improvedText.trim().length > 0) {
    modes.push(mode({
      kind: 'improved',
      label: 'Improved',
      text: transcript.improvedText,
      words: [],
      wordCount: transcript.wordCount,
    }));
  }
  return modes;
}

/** Builds per-session transcript expansions with pronunciation-map, original, and improved modes. */
export function buildDayTranscript(input: BuildDayTranscriptInput): DayTranscriptData {
  const sessions = [...input.sessions]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((session, index) => ({
      sessionId: session.id,
      title: titleFor(index + 1),
      topic: topicFor(session),
      modes: modesFor(session),
    }))
    .filter((session) => session.modes.length > 0);

  return {
    sessions,
    emptyState: sessions.length === 0 ? 'Transcript not available.' : null,
  };
}
