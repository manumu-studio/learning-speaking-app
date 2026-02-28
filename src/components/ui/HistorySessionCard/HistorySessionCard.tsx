// Individual session card in history list — clickable, shows time + label + duration
import Link from 'next/link';
import type { HistorySessionCardProps } from './HistorySessionCard.types';

// Processing states that show the amber "Processing" indicator
const PROCESSING_STATUSES = new Set(['UPLOADED', 'TRANSCRIBING', 'ANALYZING']);

function formatDuration(secs: number | null): string {
  if (secs === null) return '--';
  return `${Math.round(secs / 60)}m`;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === 'DONE') return null;

  if (status === 'FAILED') {
    return (
      <span className="flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <span className="text-red-500 text-xs">Failed</span>
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

  // CREATED — gray dot, no label
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />;
}

export function HistorySessionCard({
  id,
  intentLabel,
  topic,
  status,
  durationSecs,
  createdAt,
  animationDelay,
}: HistorySessionCardProps) {
  const time = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const label = intentLabel ?? topic ?? 'Untitled session';

  return (
    <Link
      href={`/session/${id}`}
      className="flex items-center gap-4 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all px-4 py-3"
      style={{
        animation: 'fadeInUp 0.5s ease-out both',
        animationDelay: `${animationDelay ?? 0}ms`,
      }}
    >
      <span className="text-sm text-gray-400 font-mono w-20 shrink-0">{time}</span>
      <span className="text-sm text-gray-800 font-medium flex-1 truncate">{label}</span>
      <StatusIndicator status={status} />
      <span className="text-sm text-gray-400 w-10 text-right shrink-0">
        {formatDuration(durationSecs)}
      </span>
    </Link>
  );
}
