// Tests for partial results merge — some chunks DONE, some FAILED
import { describe, expect, it } from 'vitest';
import { mergePronunciation } from '../mergePronunciation';
import { stitchTranscripts } from '../stitchTranscripts';

describe('Partial results — some chunks failed', () => {
  it('stitchTranscripts with only done chunks produces valid output', () => {
    const doneChunks = [
      { chunkIndex: 0, text: 'the beginning of the session', overlapSecs: 0 },
      { chunkIndex: 2, text: 'beginning of the session and the end too', overlapSecs: 5 },
    ];

    const result = stitchTranscripts(doneChunks);
    expect(result).toContain('the beginning of the session');
    expect(result).toContain('and the end too');
  });

  it("mergePronunciation with one valid chunk returns that chunk's score", () => {
    const result = mergePronunciation([
      {
        chunkIndex: 0,
        durationSecs: 120,
        overlapSecs: 0,
        pronunciationReport: {
          pronScore: 78,
          accuracyScore: 78,
          fluencyScore: 78,
          completenessScore: 78,
          prosodyScore: 78,
          words: [],
        },
      },
      { chunkIndex: 1, durationSecs: 120, overlapSecs: 5, pronunciationReport: null },
    ]);

    expect(result).not.toBeNull();
    expect(result?.pronScore).toBeCloseTo(78);
  });

  it('speakingRateWpm is 0 when all words are insertion/omission errors', () => {
    const word = (errorType: string) => ({
      word: 'test',
      accuracyScore: 0,
      errorType,
      offsetMs: 0,
      durationMs: 400,
      phonemes: [],
      l1Tags: [],
      breakErrorTypes: [],
      intonationErrorTypes: [],
      monotonePitchDelta: null as number | null,
    });

    const result = mergePronunciation([
      {
        chunkIndex: 0,
        durationSecs: 60,
        overlapSecs: 0,
        pronunciationReport: {
          pronScore: 40,
          accuracyScore: 40,
          fluencyScore: 40,
          completenessScore: 40,
          prosodyScore: 40,
          words: [word('Insertion'), word('Omission'), word('Insertion')],
        },
      },
    ]);

    expect(result?.speakingRateWpm).toBe(0);
  });
});
