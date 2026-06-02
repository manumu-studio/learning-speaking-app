// Curated prompt library for the /prompts browsable grid — richer display type than prompts.config

import type { CefrLevel, LibraryCategory, LibraryPrompt, PromptFormat } from './promptLibrary.types';
import { BASE_PROMPTS } from './promptLibraryBasePrompts';
import { IMAGE_FORMAT_PROMPTS, RETELL_FORMAT_PROMPTS } from './promptLibraryImageRetell';
import { SUMMARIZE_FORMAT_PROMPTS, IMPROMPTU_FORMAT_PROMPTS } from './promptLibrarySummarizeImpromptu';

export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = [
  'Professional',
  'Social',
  'Academic',
  'Daily',
] as const;

export const LIBRARY_FORMATS: readonly PromptFormat[] = [
  'opinion',
  'monologue',
  'image',
  'retell',
  'summarize',
  'impromptu',
] as const;

export const LIBRARY_CEFR_LEVELS: readonly CefrLevel[] = [
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
] as const;

export const PROMPT_LIBRARY: readonly LibraryPrompt[] = [
  ...BASE_PROMPTS,
  ...IMAGE_FORMAT_PROMPTS,
  ...RETELL_FORMAT_PROMPTS,
  ...SUMMARIZE_FORMAT_PROMPTS,
  ...IMPROMPTU_FORMAT_PROMPTS,
];

// ── Helper functions ──────────────────────────────────────────────────

/** Returns all prompts in the library that belong to the given category.
 * @param category - The category to filter by.
 * @returns An array of matching prompts.
 */
export function getLibraryByCategory(category: LibraryCategory): LibraryPrompt[] {
  return PROMPT_LIBRARY.filter((prompt) => prompt.category === category);
}

/** Finds a prompt by its unique ID, returning null if not found.
 * @param id - The prompt ID to look up.
 * @returns The matching prompt, or null.
 */
export function findPromptById(id: string): LibraryPrompt | null {
  return PROMPT_LIBRARY.find((prompt) => prompt.id === id) ?? null;
}

/** Returns all prompts that match the given format (opinion, monologue, image, etc.).
 * @param format - The format to filter by.
 * @returns An array of matching prompts.
 */
export function getLibraryByFormat(format: PromptFormat): LibraryPrompt[] {
  return PROMPT_LIBRARY.filter((prompt) => prompt.format === format);
}

/** Returns all prompts at the given CEFR level.
 * @param level - The CEFR level to filter by.
 * @returns An array of matching prompts.
 */
export function getLibraryByCefrLevel(level: CefrLevel): LibraryPrompt[] {
  return PROMPT_LIBRARY.filter((prompt) => prompt.cefrLevel === level);
}
