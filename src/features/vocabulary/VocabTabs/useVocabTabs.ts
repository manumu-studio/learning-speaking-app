// Tab state management for vocabulary page
'use client';

import { useState } from 'react';
import type { VocabTab } from './VocabTabs.types';

const STORAGE_KEY = 'lsa-vocab-active-tab';

function isVocabTab(value: string | null): value is VocabTab {
  return value === 'review' || value === 'all' || value === 'collocations';
}

function getStoredTab(): VocabTab {
  if (typeof window === 'undefined') return 'review';
  const stored = localStorage.getItem(STORAGE_KEY);
  return isVocabTab(stored) ? stored : 'review';
}

export function useVocabTabs() {
  const [activeTab, setActiveTab] = useState<VocabTab>(getStoredTab);

  function switchTab(tab: VocabTab) {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }

  return { activeTab, switchTab };
}
