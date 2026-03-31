// Displays a single AI-generated insight pattern card with category, severity, examples, and suggestion
import { InsightCardProps } from './InsightCard.types';

// Category badge color mapping
const CATEGORY_COLORS: Record<string, string> = {
  grammar: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  vocabulary: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  structure: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

// Severity pill color mapping
const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  medium: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  low: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
};

export function InsightCard({
  category,
  pattern,
  detail,
  frequency,
  severity,
  examples,
  suggestion,
  animationDelay,
}: InsightCardProps) {
  const categoryColor = CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-700';
  const severityColor = severity !== null ? (SEVERITY_COLORS[severity] ?? null) : null;

  return (
    <div
      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-5"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay ?? 0}ms`,
        opacity: 0,
      }}
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColor}`}>
          {category}
        </span>
        {severity !== null && severityColor !== null && (
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${severityColor}`}>
            {severity}
          </span>
        )}
      </div>

      {/* Pattern name */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{pattern}</h3>

      {/* Detail text */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{detail}</p>

      {/* Examples */}
      {examples !== null && examples.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Examples:
          </p>
          <ul className="space-y-1">
            {examples.map((example, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-gray-200 dark:border-gray-600 pl-3 italic"
              >
                &ldquo;{example}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestion */}
      {suggestion !== null && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          💡 {suggestion}
        </p>
      )}

      {/* Frequency */}
      {frequency !== null && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Appeared ~{frequency} times</p>
      )}
    </div>
  );
}
