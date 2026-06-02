// Groups naturalness flags by confidence tier inside a CollapsibleSection
'use client';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { NaturalnessFlagCard } from '@/components/ui/NaturalnessFlagCard';
import type { NaturalnessInsightsProps } from './NaturalnessInsights.types';
import type { NaturalnessFlagDetail } from '@/features/session/useSessionStatus.types';

type ConfidenceTier = 'high' | 'medium' | 'low';

const TIER_ORDER: ConfidenceTier[] = ['high', 'medium', 'low'];

const TIER_LABELS: Record<ConfidenceTier, string> = {
  high: 'L1 Transfer Patterns',
  medium: 'Collocation Suggestions',
  low: 'Style Notes',
};

function groupByConfidence(flags: NaturalnessFlagDetail[]): Record<ConfidenceTier, NaturalnessFlagDetail[]> {
  const groups: Record<ConfidenceTier, NaturalnessFlagDetail[]> = {
    high: [],
    medium: [],
    low: [],
  };
  for (const flag of flags) {
    groups[flag.confidence].push(flag);
  }
  return groups;
}

export function NaturalnessInsights({ flags, animationDelay = 0, onFeedback }: NaturalnessInsightsProps) {
  if (flags.length === 0) return null;

  const grouped = groupByConfidence(flags);

  return (
    <CollapsibleSection
      title="Naturalness"
      count={flags.length}
      animationDelay={animationDelay}
    >
      <div className="flex flex-col gap-4">
        {TIER_ORDER.map((tier) => {
          const tierFlags = grouped[tier];
          if (tierFlags.length === 0) return null;

          return (
            <div key={tier}>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {TIER_LABELS[tier]}
              </h4>
              <div className="flex flex-col gap-2">
                {tierFlags.map((flag) => (
                  <NaturalnessFlagCard
                    key={flag.id}
                    flag={flag}
                    onFeedback={onFeedback}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
