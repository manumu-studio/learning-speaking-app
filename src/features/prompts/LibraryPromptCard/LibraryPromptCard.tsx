// Grid card component for a single prompt in the browsable library
import Link from 'next/link';
import type { LibraryCategory } from '@/lib/prompts/promptLibrary.types';
import type { LibraryPromptCardProps } from './LibraryPromptCard.types';

const CATEGORY_COLORS: Record<LibraryCategory, string> = {
  Professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Social: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Academic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Daily: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

export function LibraryPromptCard({ prompt }: LibraryPromptCardProps) {
  const { id, category, cefrLevel, duration, title, hint, text } = prompt;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header: category badge + CEFR chip + duration */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category]}`}
        >
          {category}
        </span>
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

      {/* Divider */}
      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Prompt text */}
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>

      {/* CTA link */}
      <Link
        href={`/session/new?promptId=${id}`}
        className="mt-auto text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        Start with this prompt &rarr;
      </Link>
    </div>
  );
}
