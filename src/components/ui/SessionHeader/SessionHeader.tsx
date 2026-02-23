// Session overview card: summary text + 4 stat columns
import type { SessionHeaderProps } from './SessionHeader.types';

function formatDuration(secs: number | null): string {
  if (secs === null) return '--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface StatColumnProps {
  value: string;
  label: string;
}

function StatColumn({ value, label }: StatColumnProps) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <span className="text-lg font-semibold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function SessionHeader({
  summary,
  durationSecs,
  wordCount,
  insightCount,
  createdAt,
  animationDelay,
}: SessionHeaderProps) {
  const style = animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div
      className="rounded-xl bg-white border border-gray-200 shadow-sm p-6"
      style={style}
    >
      <p className="text-gray-700 text-base leading-relaxed mb-5">
        {summary ?? 'Session analysis complete.'}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-6 flex-wrap">
        <StatColumn value={formatDuration(durationSecs)} label="mins" />
        <StatColumn value={wordCount !== null ? String(wordCount) : '--'} label="words" />
        <StatColumn value={String(insightCount)} label="issues" />
        <StatColumn value={formatDate(createdAt)} label="date" />
      </div>
    </div>
  );
}
