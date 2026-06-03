// Tests for Levenshtein word alignment between normalized and verbatim transcripts.
import { describe, it, expect } from 'vitest';
import { alignTranscripts } from './align';

const types = (normalized: string[], verbatim: string[]): string[] =>
  alignTranscripts(normalized, verbatim).map((o) => o.type);

describe('alignTranscripts', () => {
  it('labels identical sequences as all matches', () => {
    expect(types(['i', 'went', 'home'], ['i', 'went', 'home'])).toEqual(['match', 'match', 'match']);
  });

  it('detects insertions (extra fillers in verbatim)', () => {
    const ops = alignTranscripts(['i', 'went'], ['i', 'uh', 'went']);
    expect(ops.map((o) => o.type)).toEqual(['match', 'insertion', 'match']);
    const insertion = ops.find((o) => o.type === 'insertion');
    expect(insertion?.verbatimToken).toBe('uh');
    expect(insertion?.normalizedToken).toBeNull();
  });

  it('detects deletions (word present only in normalized)', () => {
    const ops = alignTranscripts(['i', 'really', 'went'], ['i', 'went']);
    expect(ops.map((o) => o.type)).toEqual(['match', 'deletion', 'match']);
    const deletion = ops.find((o) => o.type === 'deletion');
    expect(deletion?.normalizedToken).toBe('really');
    expect(deletion?.verbatimToken).toBeNull();
  });

  it('detects substitutions (grammar correction)', () => {
    const ops = alignTranscripts(['i', 'went'], ['i', 'goed']);
    expect(ops.map((o) => o.type)).toEqual(['match', 'substitution']);
    const sub = ops.find((o) => o.type === 'substitution');
    expect(sub?.verbatimToken).toBe('goed');
    expect(sub?.normalizedToken).toBe('went');
  });

  it('treats casing- and punctuation-only differences as matches', () => {
    expect(types(['Hello,', 'World'], ['hello', 'world'])).toEqual(['match', 'match']);
  });

  it('handles empty inputs', () => {
    expect(alignTranscripts([], [])).toEqual([]);
    expect(types([], ['hi'])).toEqual(['insertion']);
    expect(types(['hi'], [])).toEqual(['deletion']);
  });
});
