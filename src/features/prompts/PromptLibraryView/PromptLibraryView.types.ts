// Prop types for the PromptLibraryView client component
import type { LibraryPrompt, LibraryCategory } from '@/lib/prompts/promptLibrary.types';

export interface PromptLibraryViewProps {
  prompts: readonly LibraryPrompt[];
  categories: readonly LibraryCategory[];
}
