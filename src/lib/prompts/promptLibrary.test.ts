// Tests for the curated prompt library — validates structure, counts, and lookup functions
import { describe, expect, it } from 'vitest';

import type { LibraryCategory } from './promptLibrary.types';
import {
  findPromptById,
  getLibraryByCategory,
  getLibraryByFormat,
  getLibraryByCefrLevel,
  LIBRARY_CATEGORIES,
  LIBRARY_FORMATS,
  LIBRARY_CEFR_LEVELS,
  PROMPT_LIBRARY,
} from './promptLibrary';

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

describe('LIBRARY_FORMATS', () => {
  it('has 6 format types', () => {
    expect(LIBRARY_FORMATS).toHaveLength(6);
  });

  it('includes all format types', () => {
    expect(LIBRARY_FORMATS).toContain('opinion');
    expect(LIBRARY_FORMATS).toContain('monologue');
    expect(LIBRARY_FORMATS).toContain('image');
    expect(LIBRARY_FORMATS).toContain('retell');
    expect(LIBRARY_FORMATS).toContain('summarize');
    expect(LIBRARY_FORMATS).toContain('impromptu');
  });
});

describe('LIBRARY_CEFR_LEVELS', () => {
  it('has 5 levels including C2', () => {
    expect(LIBRARY_CEFR_LEVELS).toHaveLength(5);
    expect(LIBRARY_CEFR_LEVELS).toContain('C2');
  });
});

describe('PROMPT_LIBRARY', () => {
  it('has at least 60 entries', () => {
    expect(PROMPT_LIBRARY.length).toBeGreaterThanOrEqual(60);
  });

  it('has at least 7 prompts per original category', () => {
    for (const category of LIBRARY_CATEGORIES) {
      const count = PROMPT_LIBRARY.filter((p) => p.category === category).length;
      expect(count, `Expected at least 7 prompts in "${category}", got ${count}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('every prompt has all required fields', () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(prompt.id, 'id must be a non-empty string').toBeTruthy();
      expect(prompt.category, 'category must be a non-empty string').toBeTruthy();
      expect(prompt.cefrLevel, 'cefrLevel must be a non-empty string').toBeTruthy();
      expect(prompt.duration, 'duration must be a non-empty string').toBeTruthy();
      expect(prompt.format, 'format must be a non-empty string').toBeTruthy();
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
        LIBRARY_CEFR_LEVELS as readonly string[],
        `"${prompt.cefrLevel}" on prompt "${prompt.id}" is not a valid CefrLevel`,
      ).toContain(prompt.cefrLevel);
    }
  });

  it('all format values are valid', () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(
        LIBRARY_FORMATS as readonly string[],
        `"${prompt.format}" on prompt "${prompt.id}" is not a valid PromptFormat`,
      ).toContain(prompt.format);
    }
  });

  it('has at least 6 C2-level prompts', () => {
    const c2Count = PROMPT_LIBRARY.filter((p) => p.cefrLevel === 'C2').length;
    expect(c2Count).toBeGreaterThanOrEqual(6);
  });

  it('image prompts have imagePath set', () => {
    const imagePrompts = PROMPT_LIBRARY.filter((p) => p.format === 'image');
    for (const p of imagePrompts) {
      expect(p.imagePath, `Image prompt "${p.id}" must have imagePath`).toBeTruthy();
    }
  });

  it('retell prompts have sourcePassage set', () => {
    const retellPrompts = PROMPT_LIBRARY.filter((p) => p.format === 'retell');
    for (const p of retellPrompts) {
      expect(p.sourcePassage, `Retell prompt "${p.id}" must have sourcePassage`).toBeTruthy();
    }
  });

  it('impromptu prompts have prepTimeSecs set', () => {
    const impromptuPrompts = PROMPT_LIBRARY.filter((p) => p.format === 'impromptu');
    for (const p of impromptuPrompts) {
      expect(p.prepTimeSecs, `Impromptu prompt "${p.id}" must have prepTimeSecs`).toBeTruthy();
    }
  });
});

describe('getLibraryByCategory', () => {
  it.each(LIBRARY_CATEGORIES as unknown as LibraryCategory[])(
    'returns at least 7 prompts for category "%s"',
    (category) => {
      const result = getLibraryByCategory(category);
      expect(result.length).toBeGreaterThanOrEqual(7);
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

describe('getLibraryByFormat', () => {
  it('returns prompts filtered by format', () => {
    const imagePrompts = getLibraryByFormat('image');
    expect(imagePrompts.length).toBeGreaterThanOrEqual(1);
    for (const p of imagePrompts) {
      expect(p.format).toBe('image');
    }
  });
});

describe('getLibraryByCefrLevel', () => {
  it('returns prompts filtered by CEFR level', () => {
    const c1Prompts = getLibraryByCefrLevel('C1');
    expect(c1Prompts.length).toBeGreaterThanOrEqual(1);
    for (const p of c1Prompts) {
      expect(p.cefrLevel).toBe('C1');
    }
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
