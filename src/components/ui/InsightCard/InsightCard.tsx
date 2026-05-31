// Displays a single AI-generated insight pattern card with category, severity, examples, and suggestion
import type { InsightCardProps } from './InsightCard.types';

// Category badge color mapping
const CATEGORY_COLORS: Record<string, string> = {
  grammar: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  vocabulary: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  structure: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

const GRAMMAR_ARROW_PATTERN = /\s*(?:→|->)\s*/;

interface GrammarCorrection {
  incorrect: string;
  corrected: string | null;
}

function parseGrammarExample(example: string): GrammarCorrection {
  const parts = example.split(GRAMMAR_ARROW_PATTERN);
  if (parts.length >= 2) {
    const incorrect = parts[0]?.trim() ?? example;
    const corrected = parts.slice(1).join(' → ').trim();
    return {
      incorrect,
      corrected: corrected.length > 0 ? corrected : null,
    };
  }
  return { incorrect: example.trim(), corrected: null };
}

function GrammarMistakeList({ examples }: { examples: string[] }) {
  return (
    <ul className="mb-3 space-y-3">
      {examples.map((example, index) => {
        const { incorrect, corrected } = parseGrammarExample(example);

        return (
          <li
            key={`${incorrect}-${index}`}
            className="rounded-lg border border-red-100 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20"
          >
            <p className="text-sm text-gray-800 dark:text-gray-200">
              You said:{' '}
              <span className="font-medium text-red-700 line-through decoration-red-400/70 dark:text-red-400">
                &ldquo;{incorrect}&rdquo;
              </span>
              {corrected !== null && (
                <>
                  {' '}
                  →{' '}
                  <span className="font-medium text-green-700 dark:text-green-400">
                    &ldquo;{corrected}&rdquo;
                  </span>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function InsightCard({
  category,
  pattern,
  detail,
  frequency,
  examples,
  suggestion,
  animationDelay,
}: InsightCardProps) {
  const categoryColor = CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-700';
  const isGrammar = category.toLowerCase() === 'grammar';
  const hasExamples = examples !== null && examples.length > 0;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay ?? 0}ms`,
        opacity: 0,
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
          {category}
        </span>
      </div>

      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">{pattern}</h3>

      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{detail}</p>

      {hasExamples && isGrammar ? (
        <GrammarMistakeList examples={examples} />
      ) : (
        hasExamples && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Examples:
            </p>
            <ul className="space-y-1">
              {examples.map((example, i) => (
                <li
                  key={i}
                  className="border-l-2 border-gray-200 pl-3 text-sm italic text-gray-700 dark:border-gray-600 dark:text-gray-300"
                >
                  &ldquo;{example}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {suggestion !== null && !isGrammar && (
        <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">💡 {suggestion}</p>
      )}

      {isGrammar && suggestion !== null && (
        <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-500 dark:text-gray-400">Why: </span>
          {suggestion}
        </p>
      )}

      {frequency !== null && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Appeared ~{frequency} times</p>
      )}
    </div>
  );
}
