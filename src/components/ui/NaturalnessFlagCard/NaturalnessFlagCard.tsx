// Renders a single naturalness flag: original → suggested with L1 source and rationale
'use client';

import { useState } from 'react';
import type { NaturalnessFlagCardProps } from './NaturalnessFlagCard.types';

const CONFIDENCE_STYLES = {
  high: 'border-amber-400/60 bg-amber-950/20',
  medium: 'border-blue-400/60 bg-blue-950/20',
  low: 'border-zinc-600/60 bg-zinc-900/30',
} as const;

const CONFIDENCE_BADGES = {
  high: { label: 'L1 Transfer', className: 'bg-amber-500/20 text-amber-300' },
  medium: { label: 'Collocation', className: 'bg-blue-500/20 text-blue-300' },
  low: { label: 'Style Note', className: 'bg-zinc-500/20 text-zinc-400' },
} as const;

const FLAG_TYPE_LABELS: Record<string, string> = {
  false_friend: 'False Friend',
  calqued_collocation: 'Calqued Collocation',
  calqued_syntax: 'Calqued Syntax',
  weak_collocation: 'Weak Collocation',
  style_note: 'Style Note',
};

export function NaturalnessFlagCard({ flag, onFeedback }: NaturalnessFlagCardProps) {
  const [feedbackState, setFeedbackState] = useState<'helpful' | 'false_positive' | null>(
    flag.userFeedback,
  );

  const handleFeedback = (feedback: 'helpful' | 'false_positive') => {
    setFeedbackState(feedback);
    onFeedback?.(flag.id, feedback);
  };

  const style = CONFIDENCE_STYLES[flag.confidence];
  const badge = CONFIDENCE_BADGES[flag.confidence];

  return (
    <div className={`rounded-lg border p-3 ${style}`}>
      {/* Header: badge + flag type */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-xs text-zinc-500">
          {FLAG_TYPE_LABELS[flag.flagType] ?? flag.flagType}
        </span>
      </div>

      {/* Original → Suggested */}
      <div className="mb-2 space-y-1">
        <p className="text-sm text-zinc-400">
          <span className="text-zinc-500">You said: </span>
          <span className="text-red-300/80 line-through">{flag.originalPhrase}</span>
        </p>
        <p className="text-sm text-zinc-300">
          <span className="text-zinc-500">Try: </span>
          <span className="font-medium text-emerald-300">{flag.suggestedPhrase}</span>
        </p>
      </div>

      {/* L1 source (high confidence only) */}
      {flag.l1TransferSource && (
        <p className="mb-2 text-xs text-amber-400/70">
          🇪🇸 From: <em>{flag.l1TransferSource}</em>
        </p>
      )}

      {/* Rationale */}
      <p className="mb-2 text-xs leading-relaxed text-zinc-500">{flag.rationale}</p>

      {/* Feedback buttons */}
      {feedbackState === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleFeedback('helpful')}
            className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            👍 Helpful
          </button>
          <button
            type="button"
            onClick={() => handleFeedback('false_positive')}
            className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          >
            👎 Not relevant
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-600">
          {feedbackState === 'helpful' ? '👍 Marked helpful' : '👎 Marked not relevant'}
        </p>
      )}
    </div>
  );
}
