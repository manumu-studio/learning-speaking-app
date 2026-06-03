// Tests for advanceMastery — mastery state machine transitions

import { describe, it, expect } from 'vitest';
import { advanceMastery } from './advanceMastery';
import type { MasteryState } from './languageBank.types';

describe('advanceMastery', () => {
  describe('threshold transitions', () => {
    it('returns emerging when usageCount < 5', () => {
      const result = advanceMastery({ currentState: 'emerging', usageCount: 4, distinctSessionCount: 1 });
      expect(result.newState).toBe('emerging');
      expect(result.changed).toBe(false);
    });

    it('returns emerging when usageCount is 0', () => {
      const result = advanceMastery({ currentState: 'emerging', usageCount: 0, distinctSessionCount: 0 });
      expect(result.newState).toBe('emerging');
      expect(result.changed).toBe(false);
    });

    it('transitions to developing at usageCount 5', () => {
      const result = advanceMastery({ currentState: 'emerging', usageCount: 5, distinctSessionCount: 1 });
      expect(result.newState).toBe('developing');
      expect(result.changed).toBe(true);
    });

    it('stays developing at usageCount 10', () => {
      const result = advanceMastery({ currentState: 'developing', usageCount: 10, distinctSessionCount: 2 });
      expect(result.newState).toBe('developing');
      expect(result.changed).toBe(false);
    });

    it('transitions to consolidating at usageCount 11', () => {
      const result = advanceMastery({ currentState: 'developing', usageCount: 11, distinctSessionCount: 2 });
      expect(result.newState).toBe('consolidating');
      expect(result.changed).toBe(true);
    });

    it('stays consolidating at usageCount 14', () => {
      const result = advanceMastery({ currentState: 'consolidating', usageCount: 14, distinctSessionCount: 2 });
      expect(result.newState).toBe('consolidating');
      expect(result.changed).toBe(false);
    });
  });

  describe('mastered threshold requires distinctSessionCount >= 3', () => {
    it('does NOT advance to mastered when usageCount >= 15 but distinctSessionCount < 3', () => {
      const result = advanceMastery({ currentState: 'consolidating', usageCount: 15, distinctSessionCount: 2 });
      expect(result.newState).toBe('consolidating');
      expect(result.changed).toBe(false);
    });

    it('advances to mastered when usageCount >= 15 AND distinctSessionCount >= 3', () => {
      const result = advanceMastery({ currentState: 'consolidating', usageCount: 15, distinctSessionCount: 3 });
      expect(result.newState).toBe('mastered');
      expect(result.changed).toBe(true);
    });

    it('advances to mastered with higher counts', () => {
      const result = advanceMastery({ currentState: 'consolidating', usageCount: 20, distinctSessionCount: 5 });
      expect(result.newState).toBe('mastered');
      expect(result.changed).toBe(true);
    });
  });

  describe('state never goes down', () => {
    it('keeps mastered even when usageCount would compute lower', () => {
      const result = advanceMastery({ currentState: 'mastered', usageCount: 3, distinctSessionCount: 1 });
      expect(result.newState).toBe('mastered');
      expect(result.changed).toBe(false);
    });

    it('keeps consolidating when computed state is developing', () => {
      const result = advanceMastery({ currentState: 'consolidating', usageCount: 7, distinctSessionCount: 1 });
      expect(result.newState).toBe('consolidating');
      expect(result.changed).toBe(false);
    });

    it('keeps developing when computed state is emerging', () => {
      const result = advanceMastery({ currentState: 'developing', usageCount: 2, distinctSessionCount: 1 });
      expect(result.newState).toBe('developing');
      expect(result.changed).toBe(false);
    });

    it('reports changed=false when state does not advance', () => {
      const states: MasteryState[] = ['emerging', 'developing', 'consolidating', 'mastered'];
      for (const state of states) {
        const result = advanceMastery({ currentState: state, usageCount: 0, distinctSessionCount: 0 });
        expect(result.changed).toBe(false);
      }
    });
  });

  describe('already at target state', () => {
    it('reports changed=false when already mastered and threshold met', () => {
      const result = advanceMastery({ currentState: 'mastered', usageCount: 20, distinctSessionCount: 5 });
      expect(result.newState).toBe('mastered');
      expect(result.changed).toBe(false);
    });
  });
});
