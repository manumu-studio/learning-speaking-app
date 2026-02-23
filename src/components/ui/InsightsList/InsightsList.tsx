// Renders a labelled list of InsightCards with staggered entrance animations
import { InsightCard } from '@/components/ui/InsightCard';
import { InsightsListProps } from './InsightsList.types';

export function InsightsList({ insights, baseDelay = 0 }: InsightsListProps) {
  return (
    <section>
      {/* Section header with count badge */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Patterns Found</h2>
        <span className="bg-gray-100 text-gray-600 text-sm font-medium px-2 py-0.5 rounded-full">
          {insights.length}
        </span>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-gray-500">No patterns detected in this session.</p>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              category={insight.category}
              pattern={insight.pattern}
              detail={insight.detail}
              frequency={insight.frequency}
              severity={insight.severity}
              examples={insight.examples}
              suggestion={insight.suggestion}
              animationDelay={baseDelay + index * 100}
            />
          ))}
        </div>
      )}
    </section>
  );
}
