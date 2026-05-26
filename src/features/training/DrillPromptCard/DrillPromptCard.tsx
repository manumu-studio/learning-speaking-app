// DrillPromptCard — displays drill instructions with type icon, prompt, source example, and time limit
'use client';

import type { DrillPromptCardProps, DrillType } from './DrillPromptCard.types';

const DRILL_TYPE_CONFIG: Record<DrillType, { icon: string; label: string }> = {
  rephrase: { icon: '🔄', label: 'Rephrase' },
  constraint: { icon: '🏗', label: 'Constraint' },
  vocabUpgrade: { icon: '📚', label: 'Vocab Upgrade' },
  precision: { icon: '🎯', label: 'Precision' },
  conclusion: { icon: '🎬', label: 'Conclusion' },
  pronunciation: { icon: '🗣', label: 'Pronunciation' },
};

function formatTimeLimit(seconds: number): string {
  return seconds >= 60 ? `${Math.floor(seconds / 60)}min` : `${seconds}s`;
}

export function DrillPromptCard({
  drillType,
  prompt,
  sourceExample,
  timeLimit,
  className,
}: DrillPromptCardProps) {
  const config = DRILL_TYPE_CONFIG[drillType];

  return (
    <div className={`rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-700/50 px-3 py-1 text-sm font-medium text-zinc-200">
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </span>
        <span className="text-sm text-zinc-400">⏱ {formatTimeLimit(timeLimit)}</span>
      </div>

      <p className="mb-4 text-lg leading-relaxed text-zinc-100">{prompt}</p>

      {sourceExample !== null && (
        <blockquote className="border-l-2 border-indigo-500/50 pl-4 text-sm italic text-zinc-400">
          &ldquo;{sourceExample}&rdquo;
        </blockquote>
      )}
    </div>
  );
}
