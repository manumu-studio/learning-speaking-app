// Displays 2-3 vocabulary upgrade suggestions with word, meaning, and example sentence
import type { VocabSuggestionsProps } from './VocabSuggestions.types';

export function VocabSuggestions({
  suggestions,
  animationDelay,
}: VocabSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const outerStyle =
    animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div
      className="space-y-3 opacity-0"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        ...outerStyle,
      }}
      aria-labelledby="vocab-suggestions-heading"
    >
      <h4
        id="vocab-suggestions-heading"
        className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300"
      >
        Words to Add
      </h4>
      <ul className="space-y-3">
        {suggestions.map((item) => (
          <li
            key={item.word}
            className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-950/20"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.word}</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{item.meaning}</p>
            <p className="mt-2 text-sm italic text-gray-700 dark:text-gray-300">
              &ldquo;{item.exampleSentence}&rdquo;
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
