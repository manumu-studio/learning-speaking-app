// Unit tests for the splitSentences utility
import { describe, it, expect } from 'vitest';
import { splitSentences } from './splitSentences';

describe('splitSentences', () => {
  it('returns empty array for blank input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   ')).toEqual([]);
  });

  it('splits on period', () => {
    const result = splitSentences('Hello world. How are you.');
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe('Hello world.');
    expect(result[1]?.text).toBe('How are you.');
  });

  it('splits on question mark and exclamation', () => {
    const result = splitSentences('Is it working? Yes! Great.');
    expect(result).toHaveLength(3);
    expect(result[0]?.text).toBe('Is it working?');
    expect(result[1]?.text).toBe('Yes!');
    expect(result[2]?.text).toBe('Great.');
  });

  it('handles a trailing fragment with no punctuation', () => {
    const result = splitSentences('First sentence. No ending here');
    expect(result).toHaveLength(2);
    expect(result[1]?.text).toBe('No ending here');
  });

  it('assigns sequential 0-based index', () => {
    const result = splitSentences('One. Two. Three.');
    expect(result.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('records correct character offsets', () => {
    const input = 'Hello. World.';
    const result = splitSentences(input);
    expect(result[0]?.start).toBe(0);
    expect(result[0]?.end).toBe(6);
    expect(result[1]?.start).toBe(7);
    expect(result[1]?.end).toBe(13);
  });

  it('handles multiple punctuation marks together', () => {
    const result = splitSentences('Wait... Really?! Yes.');
    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach((s) => expect(s.text.length).toBeGreaterThan(0));
  });
});
