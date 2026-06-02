// Dropdown list for PromptCard — shows free-speak option and categorized prompt options
'use client';

import type { PromptCategory } from '../prompts.config';
import { PROMPT_CATEGORIES } from '../prompts.config';

interface CategoryMeta {
  label: string;
  hint: string;
}

const CATEGORY_META: Record<PromptCategory, CategoryMeta> = {
  daily: { label: 'Daily', hint: 'Everyday topics and routines' },
  interview: { label: 'Interview', hint: 'Professional scenarios' },
  academic: { label: 'Academic', hint: 'Structured arguments and analysis' },
  storytelling: { label: 'Story', hint: 'Narrate experiences and memories' },
};

interface PromptDropdownMenuProps {
  activeCategory: PromptCategory;
  isFreeSpeak: boolean;
  onFreeSpeak: () => void;
  onCategorySelect: (category: PromptCategory) => void;
}

export function PromptDropdownMenu({
  activeCategory,
  isFreeSpeak,
  onFreeSpeak,
  onCategorySelect,
}: PromptDropdownMenuProps) {
  return (
    <div
      role="listbox"
      aria-label="Prompt categories"
      className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <button
        type="button"
        role="option"
        aria-selected={isFreeSpeak}
        onClick={onFreeSpeak}
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
            onClick={() => onCategorySelect(category)}
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
  );
}
