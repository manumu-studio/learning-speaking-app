// Unit tests for SRS auto-rating from usage detection
import { describe, expect, it } from 'vitest';

import { autoRate } from '../autoRate';

describe('autoRate', () => {
  it('used in session + <= 2 sessions since suggested → 5 (easy)', () => {
    expect(autoRate({ wasUsedInSession: true, sessionsSinceSuggested: 1 })).toBe(5);
    expect(autoRate({ wasUsedInSession: true, sessionsSinceSuggested: 0 })).toBe(5);
  });

  it('used in session at exactly 2 sessions since suggested → 5 (easy)', () => {
    expect(autoRate({ wasUsedInSession: true, sessionsSinceSuggested: 2 })).toBe(5);
  });

  it('used in session + > 2 sessions since suggested → 4 (good)', () => {
    expect(autoRate({ wasUsedInSession: true, sessionsSinceSuggested: 3 })).toBe(4);
    expect(autoRate({ wasUsedInSession: true, sessionsSinceSuggested: 10 })).toBe(4);
  });

  it('not used + >= 3 sessions since suggested → 1 (hard)', () => {
    expect(autoRate({ wasUsedInSession: false, sessionsSinceSuggested: 3 })).toBe(1);
    expect(autoRate({ wasUsedInSession: false, sessionsSinceSuggested: 5 })).toBe(1);
  });

  it('not used + < 3 sessions since suggested → null (too early)', () => {
    expect(autoRate({ wasUsedInSession: false, sessionsSinceSuggested: 0 })).toBeNull();
    expect(autoRate({ wasUsedInSession: false, sessionsSinceSuggested: 2 })).toBeNull();
  });
});
