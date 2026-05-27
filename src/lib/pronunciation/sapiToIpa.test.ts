// Tests for SAPI→IPA mapping table and helper functions

import { describe, expect, it } from 'vitest';
import {
  SAPI_TO_IPA,
  sapiToIpa,
  wordToIpa,
} from './sapiToIpa';

describe('SAPI_TO_IPA mapping table', () => {
  it('contains exactly 40 entries', () => {
    expect(Object.keys(SAPI_TO_IPA).length).toBe(40);
  });

  it('maps all vowels correctly', () => {
    expect(SAPI_TO_IPA['aa']).toBe('ɑː');
    expect(SAPI_TO_IPA['ae']).toBe('æ');
    expect(SAPI_TO_IPA['ah']).toBe('ʌ');
    expect(SAPI_TO_IPA['ao']).toBe('ɔː');
    expect(SAPI_TO_IPA['aw']).toBe('aʊ');
    expect(SAPI_TO_IPA['ax']).toBe('ə');
    expect(SAPI_TO_IPA['ay']).toBe('aɪ');
    expect(SAPI_TO_IPA['eh']).toBe('ɛ');
    expect(SAPI_TO_IPA['er']).toBe('ɜːr');
    expect(SAPI_TO_IPA['ey']).toBe('eɪ');
    expect(SAPI_TO_IPA['ih']).toBe('ɪ');
    expect(SAPI_TO_IPA['iy']).toBe('iː');
    expect(SAPI_TO_IPA['ow']).toBe('oʊ');
    expect(SAPI_TO_IPA['oy']).toBe('ɔɪ');
    expect(SAPI_TO_IPA['uh']).toBe('ʊ');
    expect(SAPI_TO_IPA['uw']).toBe('uː');
  });

  it('maps key consonants correctly', () => {
    expect(SAPI_TO_IPA['r']).toBe('ɹ');
    expect(SAPI_TO_IPA['sh']).toBe('ʃ');
    expect(SAPI_TO_IPA['th']).toBe('θ');
    expect(SAPI_TO_IPA['dh']).toBe('ð');
    expect(SAPI_TO_IPA['ch']).toBe('tʃ');
    expect(SAPI_TO_IPA['jh']).toBe('dʒ');
    expect(SAPI_TO_IPA['ng']).toBe('ŋ');
    expect(SAPI_TO_IPA['zh']).toBe('ʒ');
    expect(SAPI_TO_IPA['y']).toBe('j');
  });
});

describe('sapiToIpa()', () => {
  it('returns IPA for known SAPI code', () => {
    expect(sapiToIpa('eh')).toBe('ɛ');
    expect(sapiToIpa('iy')).toBe('iː');
    expect(sapiToIpa('r')).toBe('ɹ');
  });

  it('returns original input for unknown SAPI code', () => {
    expect(sapiToIpa('xyz')).toBe('xyz');
    expect(sapiToIpa('')).toBe('');
    expect(sapiToIpa('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('wordToIpa()', () => {
  it('returns empty string for empty phoneme array', () => {
    expect(wordToIpa([])).toBe('');
  });

  it('concatenates mapped IPA symbols without separator', () => {
    const phonemes = [
      { phoneme: 'eh' },
      { phoneme: 'n' },
      { phoneme: 'iy' },
    ] as const;
    expect(wordToIpa(phonemes)).toBe('ɛniː');
  });

  it('handles single phoneme', () => {
    expect(wordToIpa([{ phoneme: 'ih' }])).toBe('ɪ');
  });

  it('passes through unknown phoneme codes unchanged', () => {
    expect(wordToIpa([{ phoneme: 'eh' }, { phoneme: 'xyz' }])).toBe('ɛxyz');
  });
});
