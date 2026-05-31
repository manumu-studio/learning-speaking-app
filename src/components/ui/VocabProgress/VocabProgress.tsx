// Displays vocabulary adoption progress — words suggested by Claude and whether the user used them
'use client';

import { useVocabProgress } from './useVocabProgress';
import type { VocabProgressProps } from './VocabProgress.types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function VocabProgress({ items, animationDelay = 0 }: VocabProgressProps) {
  const { adopted, pending, label } = useVocabProgress(items);

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-blue-200/30 bg-blue-50/50 p-4 dark:border-blue-700/30 dark:bg-blue-950/20"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          Vocabulary Tracker
        </h4>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {label}
        </span>
      </div>

      <ul className="space-y-1.5">
        {adopted.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium text-gray-900 dark:text-gray-100">{item.word}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{item.meaning}</span>
            </div>
            <span className="ml-2 shrink-0 text-xs text-emerald-600 dark:text-emerald-400">
              Used {item.firstUsedAt ? formatDate(item.firstUsedAt) : ''}
            </span>
          </li>
        ))}
        {pending.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2 opacity-70 dark:bg-white/[.03]"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">{item.word}</span>
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{item.meaning}</span>
            </div>
            <span className="ml-2 shrink-0 text-xs text-amber-500 dark:text-amber-400">
              Pending
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
