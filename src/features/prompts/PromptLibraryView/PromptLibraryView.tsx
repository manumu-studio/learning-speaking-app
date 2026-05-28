// Client component — manages category filter state for the prompt library grid
'use client';

import { useState } from 'react';
import type { LibraryCategory } from '@/lib/prompts/promptLibrary.types';
import { LibraryPromptCard } from '@/features/prompts/LibraryPromptCard';
import type { PromptLibraryViewProps } from './PromptLibraryView.types';

type FilterValue = LibraryCategory | 'All';

export function PromptLibraryView({ prompts, categories }: PromptLibraryViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('All');

  const filteredPrompts =
    activeFilter === 'All'
      ? prompts
      : prompts.filter((p) => p.category === activeFilter);

  const tabs: readonly FilterValue[] = ['All', ...categories];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Speaking Prompts
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose a topic to start a guided session. Each prompt helps Claude give
          you more relevant feedback.
        </p>
      </div>

      {/* Tab bar */}
      <div role="tablist" className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(tab)}
              className={`text-sm font-medium pb-3 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filteredPrompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <LibraryPromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">
          No prompts found for this category.
        </p>
      )}
    </div>
  );
}
