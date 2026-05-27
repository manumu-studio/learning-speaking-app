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
}: HistorySessionCardProps) {
  const time = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const label = intentLabel ?? topic ?? 'Untitled session';
  const wordCountLabel = formatWordCount(wordCount);

  return (
    <Link
      href={`/session/${id}`}
      className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all px-4 py-3"
      style={{
        animation: 'fadeInUp 0.5s ease-out both',
        animationDelay: `${animationDelay ?? 0}ms`,
      }}
    >
      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full px-2 py-0.5 shrink-0 tabular-nums">
        #{workoutNumber}
      </span>

      <span className="text-sm text-gray-400 dark:text-gray-500 font-mono w-16 shrink-0">{time}</span>

      <span className="flex flex-col flex-1 min-w-0">
        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{label}</span>
        {wordCountLabel !== null && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{wordCountLabel}</span>
        )}
      </span>

      <OverallScoreDisplay score={overallScore} />

      {pronunciationScore !== null && (
        <ScoreTierBadge
          azureScore={pronunciationScore * 10}
          label="Pron"
          showNumeric={false}
        />
      )}

      <StatusIndicator status={status} />

      <span className="text-sm text-gray-400 dark:text-gray-500 w-10 text-right shrink-0">
        {formatDuration(durationSecs)}
      </span>
    </Link>
  );
}
