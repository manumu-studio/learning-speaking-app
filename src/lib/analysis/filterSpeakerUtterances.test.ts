// Tests for filterSpeakerUtterances — pure heuristic speaker filtering function.
import { describe, it, expect } from 'vitest';
import type { VerbatimWord } from '@/lib/assemblyai/transcribe';
import { filterSpeakerUtterances } from './filterSpeakerUtterances';

// ---------------------------------------------------------------------------
// Helper — builds a VerbatimWord array from blocks of word strings.
// Each block is separated by a 2500ms silence gap (≥ SILENCE_GAP_MS = 2000).
// Within a block words are spaced 200ms apart with 150ms duration each.
// ---------------------------------------------------------------------------

function buildWords(
  blocks: ReadonlyArray<ReadonlyArray<string>>,
): VerbatimWord[] {
  const WORD_DURATION = 150;
  const WORD_SPACING = 200; // gap between words within a block
  const BLOCK_GAP = 2500; // silence gap between blocks (> 2000ms threshold)

  const words: VerbatimWord[] = [];
  let cursor = 0;

  for (const block of blocks) {
    for (const text of block) {
      words.push({
        text,
        start: cursor,
        end: cursor + WORD_DURATION,
        confidence: 0.95,
      } as const);
      cursor += WORD_DURATION + WORD_SPACING;
    }
    // Advance cursor by the inter-block gap before the next block starts.
    cursor += BLOCK_GAP;
  }

  return words;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('filterSpeakerUtterances', () => {
  it('removes a coach opening phrase separated by a 2s+ gap, keeps user speech', () => {
    // Block 0: coach opening (6 words, ≤15, matches "go ahead" + "whenever you're ready")
    // Block 1: user answer (7 words, no pattern)
    const words = buildWords([
      ["Go", "ahead", "whenever", "you're", "ready", "."],
      ["I", "think", "communication", "is", "essential", "in", "teams", "."],
    ]);

    const verbatimText = words.map(w => w.text).join(' ');
    const result = filterSpeakerUtterances(verbatimText, words);

    expect(result.removedWordCount).toBe(6);
    expect(result.wordCount).toBe(8);
    expect(result.text).toBe("I think communication is essential in teams .");
    expect(result.filterMethod).toBe('heuristic');
    expect(result.words).toHaveLength(8);
  });

  it('removes a coach closing phrase separated by a 2s+ gap from user speech', () => {
    // Block 0: user content (8 words)
    // Block 1: coach closing (3 words, ≤15, matches "really solid")
    const words = buildWords([
      ["Leadership", "requires", "both", "vision", "and", "clear", "daily", "execution", "."],
      ["Really", "solid", "response", "."],
    ]);

    const verbatimText = words.map(w => w.text).join(' ');
    const result = filterSpeakerUtterances(verbatimText, words);

    expect(result.removedWordCount).toBe(4);
    expect(result.wordCount).toBe(9);
    expect(result.text).toBe("Leadership requires both vision and clear daily execution .");
    expect(result.filterMethod).toBe('heuristic');
  });

  it('keeps an ambiguous utterance of more than 15 words even if it contains a coach pattern', () => {
    // Single block — 20 words including "go ahead"; exceeds MAX_COACH_UTTERANCE_WORDS
    const longBlock = [
      "I", "want", "to", "say", "go", "ahead", "because", "this",
      "topic", "is", "really", "important", "to", "the", "entire",
      "team", "and", "I", "strongly", "agree",
    ] as const;
    const words = buildWords([longBlock]);
    const verbatimText = words.map(w => w.text).join(' ');
    const result = filterSpeakerUtterances(verbatimText, words);

    expect(result.removedWordCount).toBe(0);
    expect(result.wordCount).toBe(20);
    expect(result.filterMethod).toBe('none');
    expect(result.words).toHaveLength(20);
  });

  it('falls back to text-only heuristic when verbatimWords is null, removes matching sentence', () => {
    // Two sentences: one user answer, one coach phrase (≤15 words).
    const verbatimText =
      'I believe strong communication builds trust across the whole organization. ' +
      'Great job on that answer.';

    const result = filterSpeakerUtterances(verbatimText, null);

    expect(result.words).toEqual([]);
    // "Great job on that answer." should be stripped (matches "great job", 5 words ≤ 15)
    expect(result.text).not.toContain('Great job');
    expect(result.removedWordCount).toBeGreaterThan(0);
    expect(result.filterMethod).toBe('heuristic');
    // User sentence preserved
    expect(result.text).toContain('I believe strong communication');
  });

  it('returns empty defaults for empty input text', () => {
    const result = filterSpeakerUtterances('', []);

    expect(result.text).toBe('');
    expect(result.words).toEqual([]);
    expect(result.wordCount).toBe(0);
    expect(result.removedWordCount).toBe(0);
    expect(result.filterMethod).toBe('none');
  });

  it('returns input unchanged when no coach patterns are present', () => {
    const words = buildWords([
      ["My", "biggest", "strength", "is", "adaptability", "."],
      ["I", "quickly", "adjust", "to", "new", "environments", "and", "priorities", "."],
    ]);

    const verbatimText = words.map(w => w.text).join(' ');
    const result = filterSpeakerUtterances(verbatimText, words);

    expect(result.removedWordCount).toBe(0);
    expect(result.wordCount).toBe(words.length);
    expect(result.filterMethod).toBe('none');
    expect(result.words).toHaveLength(words.length);
    expect(result.text).toBe(verbatimText);
  });

  it('removes a mid-session coach probe and keeps surrounding user blocks', () => {
    // Block 0: user (7 words), Block 1: coach probe (4 words), Block 2: user (6 words)
    const words = buildWords([
      ["Collaboration", "is", "the", "key", "to", "scaling", "fast", "."],
      ["Can", "you", "elaborate", "on", "that", "?"],
      ["Sure", "I", "mean", "shared", "ownership", "across", "squads", "."],
    ]);

    const verbatimText = words.map(w => w.text).join(' ');
    const result = filterSpeakerUtterances(verbatimText, words);

    expect(result.removedWordCount).toBe(6);
    expect(result.wordCount).toBe(16);
    expect(result.text).not.toContain('Can you elaborate');
    expect(result.filterMethod).toBe('heuristic');
    // Both user blocks preserved
    expect(result.text).toContain('Collaboration');
    expect(result.text).toContain('Sure');
  });
});
