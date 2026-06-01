// Client component — renders the prompt library grid with multi-filter UI
'use client';

import { LibraryPromptCard } from '@/features/prompts/LibraryPromptCard';
import type { PromptLibraryViewProps } from './PromptLibraryView.types';
import { usePromptLibraryView } from './usePromptLibraryView';

function FilterRow<T extends string>({
  label,
  values,
  active,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  active: T | 'All';
  onSelect: (v: T | 'All') => void;
}) {
  const tabs: readonly (T | 'All')[] = ['All', ...values];
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">
        {label}
      </span>
      <div className="flex gap-1.5">
        {tabs.map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              onClick={() => onSelect(tab)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PromptLibraryView({
  prompts,
  categories,
  formats,
  cefrLevels,
  showFluencyAction = false,
}: PromptLibraryViewProps) {
  const {
    categoryFilter,
    setCategoryFilter,
    formatFilter,
    setFormatFilter,
    cefrFilter,
    setCefrFilter,
    filteredPrompts,
  } = usePromptLibraryView(prompts);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Speaking Prompts
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose a topic to start a guided session. Each prompt helps Claude give
          you more relevant feedback.
        </p>
      </div>

      {/* Filter rows */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
        <FilterRow label="Category" values={categories} active={categoryFilter} onSelect={setCategoryFilter} />
        <FilterRow label="Format" values={formats} active={formatFilter} onSelect={setFormatFilter} />
        <FilterRow label="Level" values={cefrLevels} active={cefrFilter} onSelect={setCefrFilter} />
      </div>

      {/* Grid */}
      {filteredPrompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <LibraryPromptCard
              key={prompt.id}
              prompt={prompt}
              showFluencyAction={showFluencyAction}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">
          No prompts match the current filters.
        </p>
      )}
    </div>
  );
}
