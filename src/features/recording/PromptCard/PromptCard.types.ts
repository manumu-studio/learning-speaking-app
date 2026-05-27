// PromptCard component prop types
import type { PromptCategory, SpeakingPrompt } from '../prompts.config';

export interface PromptCardProps {
  /** Currently selected prompt. Null means free-speak mode. */
  prompt: SpeakingPrompt | null;
  activeCategory: PromptCategory;
  onShuffle: () => void;
  onCategoryChange: (category: PromptCategory) => void;
  onFreeSpeakToggle: () => void;
  isFreeSpeak: boolean;
}
