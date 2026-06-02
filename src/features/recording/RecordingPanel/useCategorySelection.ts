// Category and prompt selection state for the recording panel
'use client';

import { useCallback, useState } from 'react';
import { pickRandomPrompt, type PromptCategory, type SpeakingPrompt } from '@/features/recording/prompts.config';

export interface CategorySelectionState {
  activeCategory: PromptCategory;
  isFreeSpeak: boolean;
  selectedPrompt: SpeakingPrompt | null;
  handleCategoryChange: (category: PromptCategory) => void;
  handleFreeSpeakToggle: () => void;
}

export function useCategorySelection(): CategorySelectionState {
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('daily');
  const [isFreeSpeak, setIsFreeSpeak] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<SpeakingPrompt | null>(null);

  const handleCategoryChange = useCallback((category: PromptCategory) => {
    setActiveCategory(category);
    setIsFreeSpeak(false);
    setSelectedPrompt(pickRandomPrompt(category));
  }, []);

  const handleFreeSpeakToggle = useCallback(() => {
    setIsFreeSpeak((prev) => {
      if (prev) return prev;
      setSelectedPrompt(null);
      return true;
    });
  }, []);

  return { activeCategory, isFreeSpeak, selectedPrompt, handleCategoryChange, handleFreeSpeakToggle };
}
