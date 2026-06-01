// Insight grouping and display by category (grammar, vocabulary, structure)
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { InsightCard } from '@/components/ui/InsightCard';
import type { SessionDetail } from '@/features/session/useSessionStatus.types';
import type { VocabSuggestion } from '@/components/ui/VocabSuggestions';

export function groupInsightsByCategory(insights: SessionDetail['insights']) {
  return {
    grammar: insights.filter((i) => i.category.toLowerCase() === 'grammar'),
    vocabulary: insights.filter((i) => i.category.toLowerCase() === 'vocabulary'),
    structure: insights.filter((i) => i.category.toLowerCase() === 'structure'),
  };
}

export function deriveVocabSuggestions(insights: SessionDetail['insights']): VocabSuggestion[] {
  return insights
    .filter((i) => i.category.toLowerCase() === 'vocabulary')
    .slice(0, 3)
    .map((insight) => ({
      word: insight.pattern,
      meaning: insight.detail,
      exampleSentence:
        insight.suggestion ??
        insight.examples?.[0] ??
        `Try using "${insight.pattern}" in your next session.`,
    }));
}

interface CategoryInsightsSectionProps {
  title: string;
  insights: SessionDetail['insights'];
  baseDelay: number;
}

export function CategoryInsightsSection({ title, insights, baseDelay }: CategoryInsightsSectionProps) {
  return (
    <CollapsibleSection title={title} count={insights.length}>
      {insights.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No issues detected</p>
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
              animationDelay={baseDelay + index * 80}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
