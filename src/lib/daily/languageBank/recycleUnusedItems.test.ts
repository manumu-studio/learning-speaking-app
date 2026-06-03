// Tests for identifyRecyclableItems — 2-day threshold, mastered exclusion, non-active exclusion

import { describe, it, expect } from 'vitest';
import { identifyRecyclableItems } from './recycleUnusedItems';
import type { RecycleInputItem } from './recycleUnusedItems';
import type { MasteryState } from './languageBank.types';

const NOW = new Date('2026-06-03T12:00:00Z');

function makeDaysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function makeItem(
  id: string,
  overrides: Partial<RecycleInputItem> = {},
): RecycleInputItem {
  return {
    id,
    lastUsedAt: makeDaysAgo(3), // stale by default
    isActiveTarget: true,
    masteryState: 'emerging' as MasteryState,
    ...overrides,
  };
}

describe('identifyRecyclableItems', () => {
  describe('2-day staleness threshold', () => {
    it('includes item with lastUsedAt null (never used)', () => {
      const item = makeItem('a', { lastUsedAt: null });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).toContain('a');
    });

    it('includes item unused for more than 2 days', () => {
      const item = makeItem('b', { lastUsedAt: makeDaysAgo(3) });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).toContain('b');
    });

    it('excludes item used exactly at the 2-day boundary (not strictly over)', () => {
      // Exactly 2 days ago — NOT over threshold
      const item = makeItem('c', { lastUsedAt: makeDaysAgo(2) });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).not.toContain('c');
    });

    it('excludes item used less than 2 days ago', () => {
      const item = makeItem('d', { lastUsedAt: makeDaysAgo(1) });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).not.toContain('d');
    });

    it('excludes item used very recently (same day)', () => {
      const item = makeItem('e', { lastUsedAt: new Date(NOW.getTime() - 60_000) }); // 1 min ago
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).not.toContain('e');
    });
  });

  describe('mastered items are excluded', () => {
    it('excludes mastered items even if stale and active', () => {
      const item = makeItem('f', {
        lastUsedAt: makeDaysAgo(10),
        masteryState: 'mastered' as MasteryState,
        isActiveTarget: true,
      });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).not.toContain('f');
    });

    it('includes consolidating items that are stale and active', () => {
      const item = makeItem('g', {
        lastUsedAt: makeDaysAgo(5),
        masteryState: 'consolidating' as MasteryState,
        isActiveTarget: true,
      });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).toContain('g');
    });

    it('includes developing items that are stale and active', () => {
      const item = makeItem('h', {
        lastUsedAt: null,
        masteryState: 'developing' as MasteryState,
        isActiveTarget: true,
      });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).toContain('h');
    });
  });

  describe('non-active-target items are excluded', () => {
    it('excludes item that is NOT an active target even if stale', () => {
      const item = makeItem('i', {
        lastUsedAt: makeDaysAgo(10),
        isActiveTarget: false,
      });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).not.toContain('i');
    });

    it('includes item that IS an active target and stale', () => {
      const item = makeItem('j', {
        lastUsedAt: makeDaysAgo(5),
        isActiveTarget: true,
      });
      const result = identifyRecyclableItems({ items: [item], now: NOW });
      expect(result.recycleIds).toContain('j');
    });
  });

  describe('combined conditions', () => {
    it('returns empty array when no items match all conditions', () => {
      const items = [
        makeItem('k', { isActiveTarget: false, lastUsedAt: null }),
        makeItem('l', { masteryState: 'mastered' as MasteryState, lastUsedAt: null }),
        makeItem('m', { lastUsedAt: makeDaysAgo(1) }),
      ];
      const result = identifyRecyclableItems({ items, now: NOW });
      expect(result.recycleIds).toHaveLength(0);
    });

    it('returns all qualifying IDs from a mixed list', () => {
      const items = [
        makeItem('recycle-1', { isActiveTarget: true, lastUsedAt: null }),
        makeItem('recycle-2', { isActiveTarget: true, lastUsedAt: makeDaysAgo(4) }),
        makeItem('skip-mastered', { isActiveTarget: true, masteryState: 'mastered' as MasteryState }),
        makeItem('skip-inactive', { isActiveTarget: false, lastUsedAt: null }),
        makeItem('skip-fresh', { isActiveTarget: true, lastUsedAt: makeDaysAgo(1) }),
      ];
      const result = identifyRecyclableItems({ items, now: NOW });
      expect(result.recycleIds).toHaveLength(2);
      expect(result.recycleIds).toContain('recycle-1');
      expect(result.recycleIds).toContain('recycle-2');
    });

    it('returns empty array for empty input', () => {
      const result = identifyRecyclableItems({ items: [], now: NOW });
      expect(result.recycleIds).toHaveLength(0);
    });
  });
});
