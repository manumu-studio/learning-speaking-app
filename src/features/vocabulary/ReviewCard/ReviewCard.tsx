// Single vocabulary review card with rating buttons
'use client';

import type { ReviewCardProps, ReviewRatingLabel } from './ReviewCard.types';

const RATING_BUTTONS: Array<{ label: ReviewRatingLabel; display: string; colors: string }> = [
  { label: 'again', display: 'Again', colors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { label: 'hard', display: 'Hard', colors: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { label: 'good', display: 'Good', colors: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  { label: 'easy', display: 'Easy', colors: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
];

export function ReviewCard({ item, onRate, isSubmitting }: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.word}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.meaning}</p>

      <blockquote className="mt-3 border-l-2 border-gray-300 pl-3 text-sm italic text-gray-600 dark:border-gray-700 dark:text-gray-300">
        {item.exampleSentence}
      </blockquote>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {item.domain}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {item.frequencyBand} freq
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {item.type}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {RATING_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            disabled={isSubmitting}
            onClick={() => onRate(item.id, btn.label)}
            aria-label={`Rate "${item.word}" as ${btn.label}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${btn.colors}`}
          >
            {btn.display}
          </button>
        ))}
      </div>
    </div>
  );
}
