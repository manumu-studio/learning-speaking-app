// PrioritySounds: the highest-functional-load pronunciation fixes, with production rules and IPA.
// These are the sounds that most affect how well the speaker is understood (Munro & Derwing 2006).
'use client';

import { ScoreChip } from '@/components/ui/ScoreChip';
import type { RankedFLError, PhoneticExample } from '@/lib/pronunciation/functionalLoad.types';
import type { PrioritySoundsProps } from './PrioritySounds.types';

const TIER_BADGE: Record<RankedFLError['tier'], { label: string; classes: string }> = {
  high: { label: 'High impact', classes: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  moderate: { label: 'Moderate', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  low: { label: 'Polish', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

// A single example word with its IPA; long vowels / diphthongs get an emphasised underline.
function ExampleChip({ example }: { example: PhoneticExample }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md bg-white/70 px-2 py-1 dark:bg-white/5">
      <span className="text-sm text-gray-700 dark:text-gray-200">{example.word}</span>
      <span
        className={`font-mono text-xs text-gray-500 dark:text-gray-400 ${
          example.hasDoubleVowelSound ? 'underline decoration-sky-400 decoration-2 underline-offset-2' : ''
        }`}
        title={example.hasDoubleVowelSound ? 'Long vowel / diphthong — hold the sound' : undefined}
      >
        {example.ipa}
      </span>
    </span>
  );
}

function PrioritySoundCard({ error }: { error: RankedFLError }) {
  const badge = TIER_BADGE[error.tier];
  return (
    <li className="rounded-lg border border-gray-200/60 bg-white/60 p-3 dark:border-gray-700/50 dark:bg-white/5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-gray-800 dark:text-gray-100">
            {error.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.classes}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-xs text-gray-400">{error.occurrences}×</span>
          {error.averageScore !== null && <ScoreChip score={error.averageScore} scale="hundred" />}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{error.rule}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {error.examples.map((ex) => (
          <ExampleChip key={ex.word} example={ex} />
        ))}
      </div>
    </li>
  );
}

export function PrioritySounds({ errors, maxItems = 3, animationDelay = 0 }: PrioritySoundsProps) {
  const top = errors.slice(0, maxItems);
  if (top.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-sky-200/40 bg-sky-50/50 p-4 dark:border-sky-800/30 dark:bg-sky-950/20"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <h4 className="text-sm font-semibold text-sky-900 dark:text-sky-200">Priority Sounds</h4>
      <p className="mt-0.5 text-xs text-sky-700/80 dark:text-sky-300/70">
        These sounds affect how well you&rsquo;re understood — focus here first.
      </p>
      <ul className="mt-3 space-y-2">
        {top.map((error) => (
          <PrioritySoundCard key={error.id} error={error} />
        ))}
      </ul>
    </div>
  );
}
