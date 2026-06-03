// 12 suggestions grouped by category + 4 active target cards
'use client';

import { SuggestionPill } from '@/features/daily/SuggestionPill';
import { ActiveTargetCard } from '@/features/daily/ActiveTargetCard';
import { useLanguageBankPanel } from './useLanguageBankPanel';
import type { LanguageBankItem } from './useLanguageBankPanel';
import type { LanguageBankPanelProps } from './LanguageBankPanel.types';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LanguageBankSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 dark:bg-gray-900" />
        ))}
      </div>
    </div>
  );
}

// ─── Group items by category ─────────────────────────────────────────────────

function groupByCategory(items: LanguageBankItem[]): Map<string, LanguageBankItem[]> {
  const map = new Map<string, LanguageBankItem[]>();
  for (const item of items) {
    const existing = map.get(item.category) ?? [];
    existing.push(item);
    map.set(item.category, existing);
  }
  return map;
}

// ─── Suggestions section ──────────────────────────────────────────────────────

function SuggestionsSection({ items }: { items: LanguageBankItem[] }) {
  const grouped = groupByCategory(items);

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <div key={category}>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
            {category.replace(/_/g, ' ')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categoryItems.map((item) => (
              <SuggestionPill
                key={item.id}
                text={item.text}
                category={item.category}
                isActiveTarget={item.isActiveTarget}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Active targets section ───────────────────────────────────────────────────

function ActiveTargetsSection({ targets }: { targets: LanguageBankItem[] }) {
  if (targets.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Active Targets
      </div>
      <div className="grid grid-cols-2 gap-3">
        {targets.slice(0, 4).map((item) => (
          <ActiveTargetCard
            key={item.id}
            text={item.text}
            category={item.category}
            usageCount={item.usageCount}
            masteryState={item.masteryState}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LanguageBankPanel({ dateKey: _dateKey }: LanguageBankPanelProps) {
  const { items, activeTargets, isLoading, error } = useLanguageBankPanel();

  if (isLoading) return <LanguageBankSkeleton />;

  if (error !== null) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">{error}</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        No suggestions yet — complete a session to start building your bank.
      </p>
    );
  }

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Tomorrow&apos;s Suggestions
      </div>
      <SuggestionsSection items={items} />
      <ActiveTargetsSection targets={activeTargets} />
    </div>
  );
}
