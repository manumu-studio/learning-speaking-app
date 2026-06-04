// Side-by-side comparison of Whisper (cleaned) and verbatim transcripts
'use client';

import { DivergenceHighlighter } from '@/components/ui/DivergenceHighlighter';
import type { TranscriptComparisonProps } from './TranscriptComparison.types';

function ColumnHeader({ label, wordCount }: { label: string; wordCount: number | null }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {wordCount !== null && (
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {wordCount} words
        </span>
      )}
    </div>
  );
}

function StatsRow({ whisperCount, verbatimCount, spanCount }: {
  whisperCount: number | null;
  verbatimCount: number | null;
  spanCount: number;
}) {
  const diff = whisperCount !== null && verbatimCount !== null
    ? verbatimCount - whisperCount
    : null;

  return (
    <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
      {diff !== null && diff !== 0 && (
        <span>
          Verbatim has <strong>{Math.abs(diff)} {diff > 0 ? 'more' : 'fewer'}</strong> words
          {diff > 0 ? ' (fillers, false starts)' : ''}
        </span>
      )}
      <span>
        {spanCount > 0
          ? `${spanCount} difference${spanCount === 1 ? '' : 's'} detected`
          : 'No differences detected — transcripts match'}
      </span>
    </div>
  );
}

export function TranscriptComparison({
  whisperText,
  verbatimText,
  divergenceSpans,
  whisperWordCount,
  verbatimWordCount,
  verbatimProvider,
}: TranscriptComparisonProps) {
  const providerLabel = verbatimProvider === 'assemblyai' || verbatimProvider === null
    ? 'AssemblyAI (verbatim)'
    : `${verbatimProvider} (verbatim)`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Whisper column */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <ColumnHeader label="Whisper (cleaned)" wordCount={whisperWordCount} />
          <div className="max-h-96 overflow-y-auto p-4 text-sm leading-relaxed font-mono text-zinc-700 dark:text-zinc-300">
            <DivergenceHighlighter text={whisperText} divergenceSpans={divergenceSpans} side="normalized" />
          </div>
        </div>

        {/* Verbatim column */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <ColumnHeader label={providerLabel} wordCount={verbatimWordCount} />
          <div className="max-h-96 overflow-y-auto p-4 text-sm leading-relaxed font-mono text-zinc-700 dark:text-zinc-300">
            <DivergenceHighlighter text={verbatimText} divergenceSpans={divergenceSpans} side="verbatim" />
          </div>
        </div>
      </div>

      <StatsRow whisperCount={whisperWordCount} verbatimCount={verbatimWordCount} spanCount={divergenceSpans.length} />
    </div>
  );
}
