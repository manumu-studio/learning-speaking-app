// Toggle between original and vocabulary-enhanced transcript versions
'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranscriptToggle } from './useTranscriptToggle';
import type { TranscriptView } from './useTranscriptToggle';
import type { TranscriptToggleProps } from './TranscriptToggle.types';

function highlightWords(text: string, words: string[]): ReactNode[] {
  if (words.length === 0) return [text];

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'giu');

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold text-sky-600 dark:text-sky-400">
        {match[0]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function ToggleButton({
  label,
  active,
  value,
  onSelect,
}: {
  label: string;
  active: boolean;
  value: TranscriptView;
  onSelect: (view: TranscriptView) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-sky-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  );
}

export function TranscriptToggle({
  originalText,
  improvedText,
  wordsUsed,
  wordCount,
  animationDelay = 0,
}: TranscriptToggleProps) {
  const { view, selectView } = useTranscriptToggle();

  const highlightedImproved = useMemo(
    () => highlightWords(improvedText, wordsUsed),
    [improvedText, wordsUsed],
  );

  return (
    <div
      className="animate-fade-in space-y-3"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Toggle tabs */}
      <div className="flex items-center gap-2" role="tablist" aria-label="Transcript version">
        <ToggleButton
          label="Your words"
          active={view === 'original'}
          value="original"
          onSelect={selectView}
        />
        <ToggleButton
          label="Improved"
          active={view === 'improved'}
          value="improved"
          onSelect={selectView}
        />
        {wordCount !== null && (
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {wordCount} words
          </span>
        )}
      </div>

      {/* Transcript content */}
      <div
        role="tabpanel"
        className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {view === 'original' ? (
          <p className="whitespace-pre-wrap">{originalText}</p>
        ) : (
          <p className="whitespace-pre-wrap">{highlightedImproved}</p>
        )}
      </div>

      {view === 'improved' && wordsUsed.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {wordsUsed.length} vocab {wordsUsed.length === 1 ? 'upgrade' : 'upgrades'} applied
        </p>
      )}
    </div>
  );
}
