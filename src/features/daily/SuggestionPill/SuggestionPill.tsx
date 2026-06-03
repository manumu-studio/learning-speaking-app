// Renders a single language bank suggestion as a colored pill
import type { SuggestionPillProps } from './SuggestionPill.types';

// ─── Category → color mapping ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  collocation: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  verb: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  prepositional_verb: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  connector: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  phrasal_verb: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  adjective: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  adverb: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
};

const DEFAULT_COLOR = 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuggestionPill({ text, category, isActiveTarget }: SuggestionPillProps) {
  const colorClasses = getCategoryColor(category);
  const ringClasses = isActiveTarget
    ? 'ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500'
    : '';

  return (
    <span
      className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${colorClasses} ${ringClasses}`}
    >
      {text}
    </span>
  );
}
