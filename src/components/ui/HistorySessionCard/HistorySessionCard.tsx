// Individual session card in history list — clickable, shows time + label + duration
import Link from 'next/link';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { ScoreTierBadge } from '@/components/ui/ScoreTierBadge';
import type { HistorySessionCardProps } from './HistorySessionCard.types';

const PROCESSING_STATUSES = new Set(['UPLOADED', 'TRANSCRIBING', 'ANALYZING']);

function formatDuration(secs: number | null): string {
  if (secs === null) return '--';
  return `${Math.round(secs / 60)}m`;
}

function formatWordCount(count: number | null): string | null {
  if (count === null) return null;
  return `${count} words`;
}

function OverallScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return null;
  return <ScoreChip score={score} scale="ten" />;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === 'DONE') return null;

  if (status === 'FAILED') {
    return (
      <span className="flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-amber-500 text-xs">Failed</span>
      </span>
    );
  }

  if (PROCESSING_STATUSES.has(status)) {
    return (
      <span className="flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-amber-500 text-xs">Processing</span>
      </span>
    );
  }

  return <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />;
}

export function HistorySessionCard({
  id,
  intentLabel,
  topic,
  status,
  durationSecs,
  wordCount,
  createdAt,
  overallScore,
  pronunciationScore,
  workoutNumber,
  animationDelay,
  onDelete,
}: HistorySessionCardProps) {
  const time = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });

  const label = intentLabel ?? topic ?? 'Untitled session';
  const wordCountLabel = formatWordCount(wordCount);

  return (
    <div
      className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all px-3 py-2.5 sm:px-4 sm:py-3"
      style={{
        animation: 'fadeInUp 0.5s ease-out both',
        animationDelay: `${animationDelay ?? 0}ms`,
      }}
    >
      <Link href={`/session/${id}`} className="absolute inset-0 z-0" aria-label={`View session: ${label}`} />

      {/* Row 1: workout #, time, label, duration */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full px-2 py-0.5 shrink-0 tabular-nums">
          #{workoutNumber}
        </span>

        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">{time}</span>

        <span className="flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-200 font-medium truncate">
          {label}
        </span>

        <StatusIndicator status={status} />

        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
          {formatDuration(durationSecs)}
        </span>

        {onDelete !== undefined && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(id);
            }}
            aria-label={`Delete session ${label}`}
            className="relative z-10 shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: word count + score badges (only if there's data to show) */}
      {(wordCountLabel !== null || overallScore !== null || pronunciationScore !== null) && (
        <div className="mt-1.5 flex items-center gap-2 pl-10">
          {wordCountLabel !== null && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{wordCountLabel}</span>
          )}
          <OverallScoreDisplay score={overallScore} />
          {pronunciationScore !== null && (
            <ScoreTierBadge
              azureScore={pronunciationScore * 10}
              label="Pron"
              showNumeric={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
