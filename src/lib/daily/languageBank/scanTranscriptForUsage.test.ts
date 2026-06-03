// Tests for scanTranscriptForUsage — transcript matching against language bank items

import { describe, it, expect } from 'vitest';
import { scanTranscriptForUsage } from './scanTranscriptForUsage';

describe('scanTranscriptForUsage', () => {
  describe('basic matching', () => {
    it('finds an item present in the transcript', () => {
      const items = [{ id: '1', text: 'however', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('I tried hard, however it did not work.', items);
      expect(results).toHaveLength(1);
      expect(results[0]?.itemId).toBe('1');
      expect(results[0]?.matchCount).toBe(1);
    });

    it('returns empty array when no items match', () => {
      const items = [{ id: '1', text: 'arguably', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('I went to the store today.', items);
      expect(results).toHaveLength(0);
    });

    it('returns empty array for empty transcript', () => {
      const items = [{ id: '1', text: 'however', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('', items);
      expect(results).toHaveLength(0);
    });

    it('returns empty array for empty items list', () => {
      const results = scanTranscriptForUsage('Some transcript text here.', []);
      expect(results).toHaveLength(0);
    });
  });

  describe('case-insensitive matching', () => {
    it('matches uppercase occurrence of a lowercase item', () => {
      const items = [{ id: '1', text: 'however', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('However, the result was different.', items);
      expect(results).toHaveLength(1);
      expect(results[0]?.matchCount).toBe(1);
    });

    it('matches mixed-case occurrences', () => {
      const items = [{ id: '1', text: 'THAT SAID', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('that said, we should move on.', items);
      expect(results).toHaveLength(1);
    });
  });

  describe('word boundary matching', () => {
    it('does not match a substring within a longer word', () => {
      const items = [{ id: '1', text: 'ran', lemmaOrPattern: null }];
      // "transport" contains "ran" but not at a word boundary
      const results = scanTranscriptForUsage('The transport was quick.', items);
      expect(results).toHaveLength(0);
    });

    it('matches the exact word surrounded by punctuation', () => {
      const items = [{ id: '1', text: 'run', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('I like to run, especially early.', items);
      expect(results).toHaveLength(1);
    });
  });

  describe('lemmaOrPattern precedence', () => {
    it('uses lemmaOrPattern over text when set', () => {
      const items = [{ id: '1', text: 'running', lemmaOrPattern: 'run' }];
      // transcript has "run" but not "running"
      const results = scanTranscriptForUsage('I like to run every morning.', items);
      expect(results).toHaveLength(1);
      expect(results[0]?.matchCount).toBe(1);
    });

    it('falls back to text when lemmaOrPattern is null', () => {
      const items = [{ id: '1', text: 'however', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage('however I disagreed.', items);
      expect(results).toHaveLength(1);
    });

    it('does not match text when lemmaOrPattern is set and text differs', () => {
      const items = [{ id: '1', text: 'running', lemmaOrPattern: 'sprint' }];
      // transcript has "running" but pattern is "sprint"
      const results = scanTranscriptForUsage('She was running to the park.', items);
      expect(results).toHaveLength(0);
    });
  });

  describe('multiple occurrences', () => {
    it('counts all occurrences in the transcript', () => {
      const items = [{ id: '1', text: 'however', lemmaOrPattern: null }];
      const results = scanTranscriptForUsage(
        'However, I tried. However, it failed. However, I recovered.',
        items,
      );
      expect(results[0]?.matchCount).toBe(3);
    });

    it('reports separate matchCounts per item', () => {
      const items = [
        { id: '1', text: 'however', lemmaOrPattern: null },
        { id: '2', text: 'therefore', lemmaOrPattern: null },
      ];
      const results = scanTranscriptForUsage(
        'however it was fine, therefore I continued, however once more.',
        items,
      );
      const byId = Object.fromEntries(results.map((r) => [r.itemId, r.matchCount]));
      expect(byId['1']).toBe(2);
      expect(byId['2']).toBe(1);
    });
  });

  describe('regex special characters in pattern', () => {
    it('safely handles patterns with regex special characters', () => {
      const items = [{ id: '1', text: 'look at', lemmaOrPattern: 'look (at|into)' }];
      // Should not throw — just escape and attempt match
      expect(() =>
        scanTranscriptForUsage('I need to look (at|into) this.', items),
      ).not.toThrow();
    });
  });
});
