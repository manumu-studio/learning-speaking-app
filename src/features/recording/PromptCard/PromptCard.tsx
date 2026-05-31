// Displays a speaking prompt as compact pill (default) or expanded card on tap
'use client';

import { useState, useEffect } from 'react';
import { PROMPT_CATEGORIES } from '../prompts.config';
import type { PromptCardProps } from './PromptCard.types';

const CATEGORY_LABELS: Record<PromptCardProps['activeCategory'], string> = {
  daily: 'Daily',
  interview: 'Interview',
  academic: 'Academic',
  storytelling: 'Story',
};

const LAST_CATEGORY_KEY = 'lsa-last-prompt-category';
const TRUNCATE_LENGTH = 40;

export function PromptCard({
  prompt,
  activeCategory,
  onShuffle,
  onCategoryChange,
  onFreeSpeakToggle,
  isFreeSpeak,
}: PromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);

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

  const handleCategorySelect = (category: typeof activeCategory) => {
    onCategoryChange(category);
    setIsCategoryExpanded(false);
    setIsExpanded(false);
    try {
      localStorage.setItem(LAST_CATEGORY_KEY, category);
    } catch {
      // localStorage unavailable
    }
  };

  const handleShuffle = () => {
    onShuffle();
    setIsCategoryExpanded(false);
    setIsExpanded(false);
  };

  const handleFreeSpeakToggle = () => {
    onFreeSpeakToggle();
    setIsCategoryExpanded(false);
    setIsExpanded(false);
  };

  const promptText = isFreeSpeak
    ? 'Free speak — say anything you like'
    : (prompt?.text ?? 'Select a category');

  const truncatedText =
    promptText.length > TRUNCATE_LENGTH
      ? `${promptText.slice(0, TRUNCATE_LENGTH)}...`
      : promptText;

  const pillLabel = isFreeSpeak ? 'Free speak' : CATEGORY_LABELS[activeCategory];

  // Compact pill mode (default)
  if (!isExpanded) {
    return (
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          aria-label="Expand prompt card"
        >
          <span className="shrink-0 font-medium text-gray-700 dark:text-gray-300">
            {pillLabel}
          </span>
          <span className="truncate text-gray-500 dark:text-gray-400">
            {truncatedText}
          </span>
        </button>
        <button
          type="button"
          onClick={handleFreeSpeakToggle}
          aria-pressed={isFreeSpeak}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            isFreeSpeak
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          Free speak
        </button>
      </div>
    );
  }

  // Expanded full card
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {isCategoryExpanded ? (
        <div
          className="mb-3 flex flex-wrap gap-1"
          role="tablist"
          aria-label="Prompt category"
        >
          {PROMPT_CATEGORIES.map((category) => {
            const isSelected = category === activeCategory && !isFreeSpeak;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleCategorySelect(category)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isFreeSpeak ? 'Free speak' : CATEGORY_LABELS[activeCategory]}
          </span>
          <button
            type="button"
            onClick={() => setIsCategoryExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            change topic
          </button>
        </div>
      )}

      <p
        className={`min-h-12 text-base leading-relaxed sm:text-lg ${
          isFreeSpeak
            ? 'italic text-gray-500 dark:text-gray-400'
            : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {isFreeSpeak
          ? 'Free speak — say anything you like'
          : (prompt?.text ?? 'Select a category to see a prompt')}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Shuffle prompt"
          onClick={handleShuffle}
          disabled={isFreeSpeak}
          className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          ↻ Shuffle
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Collapse prompt card"
          >
            ▴ Collapse
          </button>
          <button
            type="button"
            onClick={handleFreeSpeakToggle}
            aria-pressed={isFreeSpeak}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isFreeSpeak
                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Free speak
          </button>
        </div>
      </div>
    </div>
  );
}
