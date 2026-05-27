// Displays a speaking prompt with shuffle and category controls
'use client';

import { PROMPT_CATEGORIES } from '../prompts.config';
import type { PromptCardProps } from './PromptCard.types';

const CATEGORY_LABELS: Record<PromptCardProps['activeCategory'], string> = {
  daily: 'Daily',
  interview: 'Interview',
  academic: 'Academic',
  storytelling: 'Story',
};

export function PromptCard({
  prompt,
  activeCategory,
  onShuffle,
  onCategoryChange,
  onFreeSpeakToggle,
  isFreeSpeak,
}: PromptCardProps) {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
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
              onClick={() => onCategoryChange(category)}
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

      <p
        className={`min-h-[4rem] text-base leading-relaxed sm:text-lg ${
          isFreeSpeak
            ? 'italic text-gray-500 dark:text-gray-400'
            : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {isFreeSpeak
          ? 'Free speak — say anything you like'
          : (prompt?.text ?? 'Select a category to see a prompt')}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Shuffle prompt"
          onClick={onShuffle}
          disabled={isFreeSpeak}
          className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          ↻ Shuffle
        </button>
        <button
          type="button"
          onClick={onFreeSpeakToggle}
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
  );
}
