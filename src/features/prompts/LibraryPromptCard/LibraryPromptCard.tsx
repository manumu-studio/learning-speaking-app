// Grid card component for a single prompt in the browsable library
'use client';

import Link from 'next/link';
import type { LibraryCategory, PromptFormat } from '@/lib/prompts/promptLibrary.types';
import type { LibraryPromptCardProps } from './LibraryPromptCard.types';
import { useLibraryPromptCard } from './useLibraryPromptCard';

const CATEGORY_COLORS: Record<LibraryCategory, string> = {
  Professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Social: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Academic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Daily: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const FORMAT_LABELS: Record<PromptFormat, string> = {
  opinion: 'Opinion',
  monologue: 'Monologue',
  image: 'Image',
  retell: 'Retell',
  summarize: 'Summarize',
  impromptu: 'Impromptu',
};

export function LibraryPromptCard({ prompt, showFluencyAction = false }: LibraryPromptCardProps) {
  const { id, category, cefrLevel, duration, format, title, hint, text, sourcePassage, sourceText, prepTimeSecs } = prompt;
  const { isSourceOpen, toggleSource } = useLibraryPromptCard();

  const hasSource = format === 'retell' || format === 'summarize';
  const sourceContent = sourcePassage ?? sourceText;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header: badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category]}`}>
            {category}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {FORMAT_LABELS[format]}
          </span>
          {format === 'impromptu' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              {prepTimeSecs ?? 30}s prep
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium dark:bg-gray-800">
            {cefrLevel}
          </span>
          <span>{duration}</span>
        </div>
      </div>

      {/* Title and hint */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Prompt text */}
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>

      {/* Collapsible source passage for retell/summarize */}
      {hasSource && sourceContent && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={toggleSource}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span>📖 Read this first</span>
            <span>{isSourceOpen ? '▲' : '▼'}</span>
          </button>
          {isSourceOpen && (
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              {sourceContent}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto flex items-center gap-3 pt-1">
        <Link
          href={`/session/new?promptId=${id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          Quick Record &rarr;
        </Link>
        {showFluencyAction && (
          <Link
            href={`/fluency-training/new?promptId=${id}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            Start 4-3-2 &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
