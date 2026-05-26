// Unit tests for Whisper segment confidence gating
import { describe, it, expect } from 'vitest';
import {
  gateSegments,
  LOW_CONFIDENCE_LOGPROB_THRESHOLD,
  COMPRESSION_RATIO_THRESHOLD,
} from '@/lib/ai/confidenceGating';
import type { WhisperSegment } from '@/lib/ai/whisper.types';

function makeSegment(overrides: Partial<WhisperSegment>): WhisperSegment {
  return {
    id: 0,
    start: 0,
    end: 1,
    text: 'hello',
    avg_logprob: -0.3,
    no_speech_prob: 0.1,
    compression_ratio: 1.5,
    ...overrides,
  };
}

describe('gateSegments', () => {
  it('drops silent segments', () => {
    const result = gateSegments([
      makeSegment({ text: ' silence ', no_speech_prob: 0.8, avg_logprob: -1.5 }),
    ]);

    expect(result.segments[0]?.reason).toBe('silence');
    expect(result.segments[0]?.text).toBe('');
    expect(result.annotatedText).toBe('');
    expect(result.stats.droppedSegments).toBe(1);
  });

  it('flags repetition-loop segments', () => {
    const result = gateSegments([
      makeSegment({ text: 'loop text', compression_ratio: 3.0 }),
    ]);

    expect(result.segments[0]?.reason).toBe('repetition-loop');
    expect(result.annotatedText).toBe('⟨?loop text?⟩');
    expect(result.cleanText).toBe('');
    expect(result.stats.suspectSegments).toBe(1);
  });

  it('flags low-confidence segments', () => {
    const result = gateSegments([
      makeSegment({ text: 'uncertain', avg_logprob: -1.0 }),
    ]);

    expect(result.segments[0]?.reason).toBe('low-confidence');
    expect(result.annotatedText).toBe('⟨?uncertain?⟩');
  });

  it('passes normal segments through unchanged', () => {
    const result = gateSegments([
      makeSegment({ text: 'clear speech', avg_logprob: -0.3, no_speech_prob: 0.1 }),
    ]);

    expect(result.segments[0]?.suspect).toBe(false);
    expect(result.cleanText).toBe('clear speech');
    expect(result.annotatedText).toBe('clear speech');
    expect(result.stats.cleanSegments).toBe(1);
  });

  it('classifies silence over low-confidence when both match', () => {
    const result = gateSegments([
      makeSegment({
        text: 'ghost',
        no_speech_prob: 0.9,
        avg_logprob: -1.2,
        compression_ratio: 3.5,
      }),
    ]);

    expect(result.segments[0]?.reason).toBe('silence');
    expect(result.annotatedText).not.toContain('⟨?');
  });

  it('returns empty output for empty segment array', () => {
    const result = gateSegments([]);

    expect(result.cleanText).toBe('');
    expect(result.annotatedText).toBe('');
    expect(result.stats.totalSegments).toBe(0);
  });

  it('handles mixed silent, suspect, and clean segments', () => {
    const result = gateSegments([
      makeSegment({ id: 1, text: 'good', avg_logprob: -0.2 }),
      makeSegment({ id: 2, text: 'bad', avg_logprob: -1.1 }),
      makeSegment({ id: 3, text: 'quiet', no_speech_prob: 0.9, avg_logprob: -1.5 }),
    ]);

    expect(result.cleanText).toBe('good');
    expect(result.annotatedText).toContain('good');
    expect(result.annotatedText).toContain('⟨?bad?⟩');
    expect(result.annotatedText).not.toContain('quiet');
    expect(result.stats).toEqual({
      totalSegments: 3,
      droppedSegments: 1,
      suspectSegments: 1,
      cleanSegments: 1,
    });
  });

  it(`flags segment at avg_logprob ${LOW_CONFIDENCE_LOGPROB_THRESHOLD} boundary`, () => {
    const atThreshold = gateSegments([
      makeSegment({ text: 'edge', avg_logprob: LOW_CONFIDENCE_LOGPROB_THRESHOLD }),
    ]);
    expect(atThreshold.segments[0]?.suspect).toBe(false);

    const belowThreshold = gateSegments([
      makeSegment({ text: 'edge', avg_logprob: LOW_CONFIDENCE_LOGPROB_THRESHOLD - 0.01 }),
    ]);
    expect(belowThreshold.segments[0]?.reason).toBe('low-confidence');
  });

  it(`flags repetition at compression_ratio ${COMPRESSION_RATIO_THRESHOLD} boundary`, () => {
    const atThreshold = gateSegments([
      makeSegment({ text: 'ok', compression_ratio: COMPRESSION_RATIO_THRESHOLD }),
    ]);
    expect(atThreshold.segments[0]?.suspect).toBe(false);

    const aboveThreshold = gateSegments([
      makeSegment({ text: 'loop', compression_ratio: COMPRESSION_RATIO_THRESHOLD + 0.1 }),
    ]);
    expect(aboveThreshold.segments[0]?.reason).toBe('repetition-loop');
  });
});
