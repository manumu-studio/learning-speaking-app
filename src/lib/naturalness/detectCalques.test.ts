// Tests for deterministic calque detection engine
import { describe, it, expect } from 'vitest';
import { detectCalques } from './detectCalques';

describe('detectCalques', () => {
  it('returns empty array for empty transcript', () => {
    expect(detectCalques('')).toEqual([]);
    expect(detectCalques('   ')).toEqual([]);
  });

  it('returns empty array when no calques are present', () => {
    const transcript = 'I went to the store and bought some groceries for dinner tonight.';
    expect(detectCalques(transcript)).toEqual([]);
  });

  it('detects "make a party" calqued collocation', () => {
    const transcript = 'Last weekend we decided to make a party for my friend.';
    const flags = detectCalques(transcript);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      suggestedPhrase: 'throw a party, have a party',
      flagType: 'calqued_collocation',
      dimension: 'collocation',
      confidence: 'high',
      l1TransferSource: 'hacer una fiesta',
    });
  });

  it('detects "I have X years" calqued syntax', () => {
    const transcript = 'I have 30 years and I work as a developer.';
    const flags = detectCalques(transcript);
    const ageSyntax = flags.find((f) => f.flagType === 'calqued_syntax');
    expect(ageSyntax).toBeDefined();
    expect(ageSyntax?.suggestedPhrase).toBe("I'm X years old");
  });

  it('detects "depends of" preposition calque', () => {
    const transcript = 'It depends of the situation you know.';
    const flags = detectCalques(transcript);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      suggestedPhrase: 'depends on',
      flagType: 'calqued_syntax',
    });
  });

  it('detects "assist to" false friend', () => {
    const transcript = 'I need to assist to the meeting tomorrow morning.';
    const flags = detectCalques(transcript);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      suggestedPhrase: 'attend',
      flagType: 'false_friend',
      l1TransferSource: 'asistir a',
    });
  });

  it('detects multiple calques in one transcript', () => {
    const transcript =
      'I have 25 years and I need to make a question about the party. Also it depends of the teacher.';
    const flags = detectCalques(transcript);
    expect(flags.length).toBeGreaterThanOrEqual(3);
    const types = flags.map((f) => f.flagType);
    expect(types).toContain('calqued_syntax');
    expect(types).toContain('calqued_collocation');
  });

  it('detects "the people is" singular verb calque', () => {
    const transcript = 'The people is very friendly in Colombia.';
    const flags = detectCalques(transcript);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.suggestedPhrase).toBe('people are');
  });

  it('detects double negative calque', () => {
    const transcript = "I don't have nothing to say about that topic.";
    const flags = detectCalques(transcript);
    const doubleNeg = flags.find((f) => f.l1TransferSource === 'no...nada/nadie');
    expect(doubleNeg).toBeDefined();
  });

  it('does not false-positive on "actually" used correctly mid-sentence', () => {
    const transcript = 'I actually think this is a great idea.';
    const flags = detectCalques(transcript);
    const actuallyFlag = flags.find((f) => f.l1TransferSource === 'actualmente');
    expect(actuallyFlag).toBeUndefined();
  });

  it('includes context snippet in originalPhrase', () => {
    const transcript = 'Yesterday we decided to make a party at the office and it was fun.';
    const flags = detectCalques(transcript);
    expect(flags[0]?.originalPhrase).toContain('make a party');
    expect(flags[0]?.originalPhrase.length).toBeLessThan(120);
  });

  it('all returned flags have high confidence', () => {
    const transcript = 'I am agree with that and the people is nice.';
    const flags = detectCalques(transcript);
    for (const flag of flags) {
      expect(flag.confidence).toBe('high');
      expect(flag.shownToUser).toBe(true);
    }
  });
});
