// Dropdown prompt selector — pick a category or free speak, shown as a compact pill
'use client';
/* eslint-disable max-lines-per-function */

import { useState, useEffect, useRef } from 'react';
import { PROMPT_CATEGORIES } from '../prompts.config';
import type { PromptCardProps } from './PromptCard.types';

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

export function PromptCard({
  prompt,
  activeCategory,
  onCategoryChange,
  onFreeSpeakToggle,
  isFreeSpeak,
}: PromptCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_CATEGORY_KEY);
      if (saved && PROMPT_CATEGORIES.includes(saved as typeof activeCategory)) {
        onCategoryChange(saved as typeof activeCategory);
      }
    } catch {
      // localStorage unavailable — use default
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const promptText = isFreeSpeak
    ? 'Say anything — no topic constraints'
    : (prompt?.text ?? 'Select a category');

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select prompt category"
        className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-800"
      >
        <span className="shrink-0 rounded-md bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {currentLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-gray-500 dark:text-gray-400">
          {promptText}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Prompt categories"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <button
            type="button"
            role="option"
            aria-selected={isFreeSpeak}
            onClick={handleFreeSpeak}
            className={`flex w-full flex-col px-4 py-2.5 text-left transition-colors ${
              isFreeSpeak
                ? 'bg-blue-50 dark:bg-blue-950/30'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Free speak
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Talk about anything — no prompt
            </span>
          </button>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {PROMPT_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const isSelected = category === activeCategory && !isFreeSpeak;
            return (
              <button
                key={category}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleCategorySelect(category)}
                className={`flex w-full flex-col px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {meta.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {meta.hint}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
