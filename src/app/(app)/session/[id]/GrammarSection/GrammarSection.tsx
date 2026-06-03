// Displays classified grammar flags — verbatim vs normalized with error badges and suggestions
'use client';

import { useState } from 'react';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import type { GrammarFlag } from '@/lib/analysis/grammar';
import type { GrammarSectionProps } from './GrammarSection.types';

const CLASSIFICATION_STYLES = {
  grammar_error: { label: 'Grammar Error', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  self_correction: { label: 'Self-Correction', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  pronunciation_artifact: { label: 'ASR Artifact', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  false_start: { label: 'False Start', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
} as const;

const ERROR_TYPE_LABELS: Record<string, string> = {
  verb_tense: 'Verb Tense',
  article: 'Article',
  preposition: 'Preposition',
  agreement: 'Agreement',
  word_order: 'Word Order',
  other: 'Other',
};

function GrammarFlagCard({ flag }: { readonly flag: GrammarFlag }) {
  const style = CLASSIFICATION_STYLES[flag.classification];
  const confidencePercent = Math.round(flag.confidence * 100);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {style.label}
          </span>
          {flag.errorType && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {ERROR_TYPE_LABELS[flag.errorType] ?? flag.errorType}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{confidencePercent}%</span>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-gray-400 line-through">{flag.verbatimText}</p>
        <p className="text-gray-900 dark:text-gray-100 font-medium">{flag.normalizedText}</p>
      </div>

      {flag.suggestion && (
        <p className="text-xs text-blue-600 dark:text-blue-400">💡 {flag.suggestion}</p>
      )}

      {flag.corpusEvidence && (
        <p className="text-xs text-gray-500 dark:text-gray-400">📊 {flag.corpusEvidence}</p>
      )}

      {flag.explanation && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{flag.explanation}</p>
      )}
    </div>
  );
}

export function GrammarSection({ flags, animationDelay }: GrammarSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const errors = flags.filter((f) => f.classification === 'grammar_error');
  const others = flags.filter((f) => f.classification !== 'grammar_error');
  const displayFlags = showAll ? [...errors, ...others] : errors;

  if (errors.length === 0 && !showAll) return null;

  return (
    <CollapsibleSection
      title="Grammar Evidence"
      count={errors.length}
      animationDelay={animationDelay}
    >
      <div className="flex flex-col gap-3">
        {displayFlags.map((flag) => (
          <GrammarFlagCard key={`${flag.spanIndex}-${flag.classification}`} flag={flag} />
        ))}

        {others.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 self-start"
          >
            {showAll ? 'Hide non-errors' : `Show all (${others.length} self-corrections/artifacts)`}
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
}
