// Tests for the curated prompt library — validates structure, counts, and lookup functions
import { describe, expect, it } from 'vitest';

import type { CefrLevel, LibraryCategory, PromptDuration } from './promptLibrary.types';
import {
  findPromptById,
  getLibraryByCategory,
  LIBRARY_CATEGORIES,
  PROMPT_LIBRARY,
} from './promptLibrary';

const VALID_CEFR_LEVELS: readonly CefrLevel[] = ['A2', 'B1', 'B2', 'C1'];
const VALID_DURATIONS: readonly PromptDuration[] = ['30s', '60s', '90s', '120s'];

describe('LIBRARY_CATEGORIES', () => {
  it('has exactly 4 entries', () => {
    expect(LIBRARY_CATEGORIES).toHaveLength(4);
  });

  it('contains Professional, Social, Academic, and Daily', () => {
    expect(LIBRARY_CATEGORIES).toContain('Professional');
    expect(LIBRARY_CATEGORIES).toContain('Social');
    expect(LIBRARY_CATEGORIES).toContain('Academic');
    expect(LIBRARY_CATEGORIES).toContain('Daily');
  });
});

describe('PROMPT_LIBRARY', () => {
  it('has exactly 28 entries', () => {
    expect(PROMPT_LIBRARY).toHaveLength(28);
  });

  it('has exactly 7 prompts per category', () => {
    for (const category of LIBRARY_CATEGORIES) {
      const count = PROMPT_LIBRARY.filter((p) => p.category === category).length;
      expect(count, `Expected 7 prompts in "${category}", got ${count}`).toBe(7);
    }
  });

  it('every prompt has all required fields', () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(prompt.id, 'id must be a non-empty string').toBeTruthy();
      expect(prompt.category, 'category must be a non-empty string').toBeTruthy();
      expect(prompt.cefrLevel, 'cefrLevel must be a non-empty string').toBeTruthy();
      expect(prompt.duration, 'duration must be a non-empty string').toBeTruthy();
      expect(prompt.title, 'title must be a non-empty string').toBeTruthy();
      expect(prompt.hint, 'hint must be a non-empty string').toBeTruthy();
      expect(prompt.text, 'text must be a non-empty string').toBeTruthy();
    }
  });

  it('all prompt IDs are unique', () => {
    const ids = PROMPT_LIBRARY.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all cefrLevel values are valid', () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(
        VALID_CEFR_LEVELS,
        `"${prompt.cefrLevel}" on prompt "${prompt.id}" is not a valid CefrLevel`,
      ).toContain(prompt.cefrLevel);
    }
  });

  it('all duration values are valid', () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(
        VALID_DURATIONS,
        `"${prompt.duration}" on prompt "${prompt.id}" is not a valid PromptDuration`,
      ).toContain(prompt.duration);
    }
  });
});

describe('getLibraryByCategory', () => {
  it.each(LIBRARY_CATEGORIES as unknown as LibraryCategory[])(
    'returns 7 prompts for category "%s"',
    (category) => {
      const result = getLibraryByCategory(category);
      expect(result).toHaveLength(7);
    },
  );

  it('returns prompts that all belong to the requested category', () => {
    for (const category of LIBRARY_CATEGORIES) {
      const result = getLibraryByCategory(category);
      for (const prompt of result) {
        expect(prompt.category).toBe(category);
      }
    }
  });

  it('returns an empty array for an unknown category', () => {
    const result = getLibraryByCategory('Unknown' as LibraryCategory);
    expect(result).toEqual([]);
  });
});

describe('findPromptById', () => {
  it('returns the correct prompt for a valid id', () => {
    const prompt = findPromptById('pro-intro');
    expect(prompt).not.toBeNull();
    expect(prompt?.id).toBe('pro-intro');
    expect(prompt?.category).toBe('Professional');
    expect(prompt?.title).toBe('Tell me about yourself');
  });

  it('returns null for an unknown id', () => {
    const result = findPromptById('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns a different prompt for each distinct id', () => {
    const first = findPromptById('soc-small-talk');
    const second = findPromptById('acad-correlation');
    expect(first?.id).toBe('soc-small-talk');
    expect(second?.id).toBe('acad-correlation');
    expect(first?.id).not.toBe(second?.id);
  });
});
