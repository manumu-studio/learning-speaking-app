// Tests for selectDailySuggestions — weekday rotation, priority scoring, fill logic, active targets

import { describe, it, expect } from 'vitest';
import { selectDailySuggestions } from './selectDailySuggestions';
import type { SelectionItem } from './selectDailySuggestions';
import type { SuggestionCategory, MasteryState } from './languageBank.types';

function makeItem(
  id: string,
  category: SuggestionCategory,
  overrides: Partial<Omit<SelectionItem, 'id' | 'category'>> = {},
): SelectionItem {
  return {
    id,
    text: `item-${id}`,
    category,
    usageCount: 0,
    masteryState: 'emerging' as MasteryState,
    lastSuggestedAt: null,
    ...overrides,
  };
}

function makeItems(
  category: SuggestionCategory,
  count: number,
  startId = 0,
): SelectionItem[] {
  return Array.from({ length: count }, (_, i) =>
    makeItem(`${category}-${startId + i}`, category),
  );
}

describe('selectDailySuggestions', () => {
  describe('output shape', () => {
    it('returns 12 suggestions when enough items exist', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        ...makeItems('connector', 4, 100), // Mon rotating
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 }); // Monday
      expect(result.suggestions).toHaveLength(12);
    });

    it('returns exactly 4 active target IDs', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        ...makeItems('connector', 4, 100),
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      expect(result.activeTargetIds).toHaveLength(4);
    });

    it('active target IDs are all present in suggestions', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        ...makeItems('adjective', 4, 100), // Tue rotating
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 2 }); // Tuesday
      const suggestionIds = new Set(result.suggestions.map((s) => s.id));
      for (const id of result.activeTargetIds) {
        expect(suggestionIds.has(id)).toBe(true);
      }
    });
  });

  describe('weekday category rotation', () => {
    const baseItems = [
      ...makeItems('collocation', 4),
      ...makeItems('verb', 4),
    ];

    it('uses connector on Monday (1)', () => {
      const items = [...baseItems, ...makeItems('connector', 4, 100)];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      const rotatingSlice = result.suggestions.slice(8);
      expect(rotatingSlice.every((s) => s.category === 'connector')).toBe(true);
    });

    it('uses adjective on Tuesday (2)', () => {
      const items = [...baseItems, ...makeItems('adjective', 4, 100)];
      const result = selectDailySuggestions({ items, dayOfWeek: 2 });
      const rotatingSlice = result.suggestions.slice(8);
      expect(rotatingSlice.every((s) => s.category === 'adjective')).toBe(true);
    });

    it('uses adverb on Wednesday (3)', () => {
      const items = [...baseItems, ...makeItems('adverb', 4, 100)];
      const result = selectDailySuggestions({ items, dayOfWeek: 3 });
      const rotatingSlice = result.suggestions.slice(8);
      expect(rotatingSlice.every((s) => s.category === 'adverb')).toBe(true);
    });

    it('uses phrasal_verb on Thursday (4)', () => {
      const items = [...baseItems, ...makeItems('phrasal_verb', 4, 100)];
      const result = selectDailySuggestions({ items, dayOfWeek: 4 });
      const rotatingSlice = result.suggestions.slice(8);
      expect(rotatingSlice.every((s) => s.category === 'phrasal_verb')).toBe(true);
    });

    it('uses adverb on Sunday (0)', () => {
      const items = [...baseItems, ...makeItems('adverb', 4, 100)];
      const result = selectDailySuggestions({ items, dayOfWeek: 0 });
      const rotatingSlice = result.suggestions.slice(8);
      expect(rotatingSlice.every((s) => s.category === 'adverb')).toBe(true);
    });
  });

  describe('priority sorting', () => {
    it('prefers items closest to next mastery threshold', () => {
      // emerging threshold is 0-4. Next threshold (developing) starts at 5.
      // usageCount=4 → distance=1, usageCount=0 → distance=5
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        makeItem('conn-low', 'connector', { usageCount: 0, masteryState: 'emerging' }),
        makeItem('conn-close', 'connector', { usageCount: 4, masteryState: 'emerging' }),
        makeItem('conn-mid', 'connector', { usageCount: 2, masteryState: 'emerging' }),
        makeItem('conn-extra', 'connector', { usageCount: 1, masteryState: 'emerging' }),
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 }); // Mon = connector
      const connectorSuggestions = result.suggestions.filter((s) => s.category === 'connector');
      // conn-close (distance 1) should appear before conn-low (distance 5)
      const closeIdx = connectorSuggestions.findIndex((s) => s.id === 'conn-close');
      const lowIdx = connectorSuggestions.findIndex((s) => s.id === 'conn-low');
      expect(closeIdx).toBeLessThan(lowIdx);
    });

    it('breaks priority ties by oldest lastSuggestedAt (stale first)', () => {
      const older = new Date('2026-01-01');
      const newer = new Date('2026-06-01');
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        makeItem('conn-new', 'connector', { usageCount: 2, lastSuggestedAt: newer }),
        makeItem('conn-old', 'connector', { usageCount: 2, lastSuggestedAt: older }),
        makeItem('conn-null', 'connector', { usageCount: 2, lastSuggestedAt: null }),
        makeItem('conn-extra', 'connector', { usageCount: 2, lastSuggestedAt: null }),
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      const connectorSuggestions = result.suggestions.filter((s) => s.category === 'connector');
      const oldIdx = connectorSuggestions.findIndex((s) => s.id === 'conn-old');
      const newIdx = connectorSuggestions.findIndex((s) => s.id === 'conn-new');
      expect(oldIdx).toBeLessThan(newIdx);
    });
  });

  describe('fill from other category when insufficient items', () => {
    it('fills connector shortfall with items from other categories', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        makeItem('conn-only', 'connector', {}), // only 1 connector for Mon's rotating slot
        ...makeItems('adjective', 10, 200),     // plenty of adjectives to fill
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 }); // Mon = connector
      // Should still return 12 total (filled from adjectives)
      expect(result.suggestions).toHaveLength(12);
    });

    it('handles empty items array gracefully', () => {
      const result = selectDailySuggestions({ items: [], dayOfWeek: 1 });
      expect(result.suggestions).toHaveLength(0);
      expect(result.activeTargetIds).toHaveLength(0);
    });

    it('returns fewer than 12 suggestions when total items < 12', () => {
      const items = makeItems('collocation', 5);
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      expect(result.suggestions.length).toBeLessThanOrEqual(12);
    });
  });

  describe('active target selection', () => {
    it('selects items closest to mastery threshold as active targets', () => {
      // Items with usageCount=4 are 1 away from developing (threshold=5) — closest
      // Items with usageCount=0 are 5 away
      const closeItems = [
        makeItem('close-1', 'collocation', { usageCount: 4 }),
        makeItem('close-2', 'collocation', { usageCount: 4 }),
        makeItem('close-3', 'verb', { usageCount: 4 }),
        makeItem('close-4', 'verb', { usageCount: 4 }),
      ];
      const farItems = [
        makeItem('far-1', 'collocation', { usageCount: 0 }),
        makeItem('far-2', 'collocation', { usageCount: 0 }),
        makeItem('far-3', 'verb', { usageCount: 0 }),
        makeItem('far-4', 'verb', { usageCount: 0 }),
        ...makeItems('connector', 4, 100),
      ];
      const result = selectDailySuggestions({ items: [...closeItems, ...farItems], dayOfWeek: 1 });
      const activeSet = new Set(result.activeTargetIds);
      expect(activeSet.has('close-1')).toBe(true);
      expect(activeSet.has('close-2')).toBe(true);
      expect(activeSet.has('close-3')).toBe(true);
      expect(activeSet.has('close-4')).toBe(true);
    });

    it('does not include duplicate IDs in activeTargetIds', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        ...makeItems('connector', 4, 100),
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      const unique = new Set(result.activeTargetIds);
      expect(unique.size).toBe(result.activeTargetIds.length);
    });
  });

  describe('suggestion structure', () => {
    it('each suggestion has id, text, and category', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        ...makeItems('connector', 4, 100),
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      for (const s of result.suggestions) {
        expect(typeof s.id).toBe('string');
        expect(typeof s.text).toBe('string');
        expect(typeof s.category).toBe('string');
      }
    });

    it('no duplicate IDs in suggestions', () => {
      const items = [
        ...makeItems('collocation', 4),
        ...makeItems('verb', 4),
        ...makeItems('connector', 4, 100),
      ];
      const result = selectDailySuggestions({ items, dayOfWeek: 1 });
      const ids = result.suggestions.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });
});
