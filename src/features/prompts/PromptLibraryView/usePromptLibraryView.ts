// Hook managing multi-filter state for the prompt library grid
import { useState, useMemo } from 'react';
import type { LibraryPrompt, LibraryCategory, PromptFormat, CefrLevel } from '@/lib/prompts/promptLibrary.types';

type CategoryFilter = LibraryCategory | 'All';
type FormatFilter = PromptFormat | 'All';
type CefrFilter = CefrLevel | 'All';

export function usePromptLibraryView(prompts: readonly LibraryPrompt[]) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('All');
  const [cefrFilter, setCefrFilter] = useState<CefrFilter>('All');

  const filteredPrompts = useMemo(
    () =>
      prompts.filter((p) => {
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (formatFilter !== 'All' && p.format !== formatFilter) return false;
        if (cefrFilter !== 'All' && p.cefrLevel !== cefrFilter) return false;
        return true;
      }),
    [prompts, categoryFilter, formatFilter, cefrFilter],
  );

  return {
    categoryFilter,
    setCategoryFilter,
    formatFilter,
    setFormatFilter,
    cefrFilter,
    setCefrFilter,
    filteredPrompts,
  };
}
