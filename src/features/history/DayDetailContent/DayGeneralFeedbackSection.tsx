// General Feedback section — summary, suggestion words, active targets, word bank
'use client';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import type { DayDetailData } from '@/lib/daily/dayDetail/buildDayDetailData.types';

type GeneralFeedback = DayDetailData['generalFeedback'];
type SuggestionWord = GeneralFeedback['suggestionWords'][number];
type WordBankGroup = GeneralFeedback['wordBank'][number];

const FAMILY_ORDER: readonly SuggestionWord['family'][] = ['collocation', 'connector', 'adjectiveAdverb', 'verb'];

const FAMILY_LABELS: Record<string, string> = {
  collocation: 'Collocations',
  connector: 'Connectors',
  adjectiveAdverb: 'Adjectives / Adverbs',
  verb: 'Verbs',
};

const MASTERY_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  learning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  familiar: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  mastered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function SuggestionWordsGrouped({ words }: { words: readonly SuggestionWord[] }) {
  if (words.length === 0) return null;
  const grouped = new Map<string, SuggestionWord[]>();
  for (const w of words) {
    const bucket = grouped.get(w.family) ?? [];
    bucket.push(w);
    grouped.set(w.family, bucket);
  }
  return (
    <CollapsibleSection title="Suggestion Words" count={words.length} defaultOpen={false}>
      <div className="space-y-3">
        {FAMILY_ORDER.map((family) => {
          const items = grouped.get(family);
          if (items === undefined || items.length === 0) return null;
          return (
            <div key={family}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {FAMILY_LABELS[family]} ({items.length})
              </p>
              <ul className="space-y-1">
                {items.map((word) => (
                  <li key={word.text} className="flex items-baseline gap-2 pl-1 text-sm">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{word.text}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">— {word.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

function ActiveTargetsRow({ targets }: { targets: GeneralFeedback['activeTargets'] }) {
  if (targets.length === 0) return null;
  return (
    <CollapsibleSection title="Active Targets" count={targets.length} defaultOpen={false}>
      <div className="space-y-2">
        {targets.map((target) => (
          <div key={target.text} className="flex items-start gap-2 rounded-lg border-l-4 border-l-emerald-400 bg-emerald-50/50 p-3 dark:border-l-emerald-600 dark:bg-emerald-950/20">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{target.text}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">— {target.reason}</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function WordBankSection({ groups }: { groups: readonly WordBankGroup[] }) {
  if (groups.length === 0) return null;
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
  return (
    <CollapsibleSection title="Word Bank" count={totalItems} defaultOpen={false}>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const masteryColor = MASTERY_COLORS[item.masteryState] ?? MASTERY_COLORS.new;
                return (
                  <span
                    key={item.text}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${masteryColor} ${item.isActiveTarget ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : ''}`}
                  >
                    {item.text}
                    {item.usageCount > 0 && (
                      <span className="opacity-60">×{item.usageCount}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

export function GeneralFeedbackSection({ data }: { data: DayDetailData }) {
  const feedback = data.generalFeedback;
  return (
    <CollapsibleSection title="General Feedback">
      <div className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {feedback.summary || feedback.emptyState || 'No day-level feedback is available yet.'}
        </p>
        <SuggestionWordsGrouped words={feedback.suggestionWords} />
        <ActiveTargetsRow targets={feedback.activeTargets} />
        <WordBankSection groups={feedback.wordBank} />
      </div>
    </CollapsibleSection>
  );
}
