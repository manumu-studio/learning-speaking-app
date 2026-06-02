// Prop types for the PromptLibraryView client component
import type { LibraryPrompt, LibraryCategory, PromptFormat, CefrLevel } from '@/lib/prompts/promptLibrary.types';

export interface PromptLibraryViewProps {
  prompts: readonly LibraryPrompt[];
  categories: readonly LibraryCategory[];
  formats: readonly PromptFormat[];
  cefrLevels: readonly CefrLevel[];
  showFluencyAction?: boolean;
}
