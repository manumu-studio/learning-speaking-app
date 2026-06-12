// Dropdown prompt selector — pick a category or free speak, shown as a compact pill
'use client';

import { useState, useEffect, useRef } from 'react';
import { PROMPT_CATEGORIES } from '../prompts.config';
import type { PromptCategory } from '../prompts.config';
import type { PromptCardProps } from './PromptCard.types';
import { PromptDropdownMenu } from './PromptDropdownMenu';
import { PromptTriggerButton } from './PromptTriggerButton';

const CATEGORY_META: Record<
  PromptCardProps['activeCategory'],
  { label: string; hint: string }
> = {
  daily: { label: 'Daily', hint: 'Everyday topics and routines' },
  interview: { label: 'Interview', hint: 'Professional scenarios' },
  academic: { label: 'Academic', hint: 'Structured arguments and analysis' },
  storytelling: { label: 'Story', hint: 'Narrate experiences and memories' },
};

const LAST_CATEGORY_KEY = 'lsa-last-prompt-category';

function isPromptCategory(value: string): value is PromptCategory {
  return (PROMPT_CATEGORIES as readonly string[]).includes(value);
}

export function PromptCard({
  prompt,
  activeCategory,
  onCategoryChange,
  onFreeSpeakToggle,
  isFreeSpeak,
}: PromptCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore saved category on mount only — intentional empty dep array
   
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_CATEGORY_KEY);
      if (saved !== null && isPromptCategory(saved)) {
        onCategoryChange(saved);
      }
    } catch {
      // localStorage unavailable — use default
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only: restores saved category once, re-running would overwrite user selection

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && e.target instanceof Node && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCategorySelect = (category: typeof activeCategory) => {
    if (isFreeSpeak) onFreeSpeakToggle();
    onCategoryChange(category);
    setIsOpen(false);
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, category);
    } catch {
      // localStorage unavailable
    }
  };

  const handleFreeSpeak = () => {
    if (!isFreeSpeak) onFreeSpeakToggle();
    setIsOpen(false);
  };

  const currentLabel = isFreeSpeak ? 'Free speak' : CATEGORY_META[activeCategory].label;
  const promptText = isFreeSpeak ? 'Say anything — no topic constraints' : (prompt?.text ?? 'Select a category');

  return (
    <div ref={dropdownRef} className="relative w-full">
      <PromptTriggerButton
        isOpen={isOpen}
        currentLabel={currentLabel}
        promptText={promptText}
        onToggle={() => setIsOpen((prev) => !prev)}
      />
      {isOpen && (
        <PromptDropdownMenu
          activeCategory={activeCategory}
          isFreeSpeak={isFreeSpeak}
          onFreeSpeak={handleFreeSpeak}
          onCategorySelect={handleCategorySelect}
        />
      )}
    </div>
  );
}
