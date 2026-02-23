// Displays a single AI-generated insight pattern card with category, severity, examples, and suggestion
import { InsightCardProps } from './InsightCard.types';

// Category badge color mapping
const CATEGORY_COLORS: Record<string, string> = {
  grammar: 'bg-blue-100 text-blue-700',
  vocabulary: 'bg-violet-100 text-violet-700',
  structure: 'bg-amber-100 text-amber-700',
};

// Severity pill color mapping
const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
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
      className="rounded-xl bg-white border border-gray-200 shadow-sm p-5"
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
      <h3 className="text-base font-semibold text-gray-900 mb-1">{pattern}</h3>

      {/* Detail text */}
      <p className="text-sm text-gray-600 mb-3">{detail}</p>

      {/* Examples */}
      {examples !== null && examples.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Examples:
          </p>
          <ul className="space-y-1">
            {examples.map((example, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 border-l-2 border-gray-200 pl-3 italic"
              >
                &ldquo;{example}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestion */}
      {suggestion !== null && (
        <p className="text-sm text-gray-700 mb-3">
          💡 {suggestion}
        </p>
      )}

      {/* Frequency */}
      {frequency !== null && (
        <p className="text-xs text-gray-400">Appeared ~{frequency} times</p>
      )}
    </div>
  );
}
