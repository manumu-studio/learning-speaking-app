// PillarCard — collapsible pillar summary card with constituent metric reveal
'use client';

import { SparkLine } from '@/components/ui/SparkLine';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { ChevronDown } from 'lucide-react';
import type { PillarCardProps } from './PillarCard.types';

const ACCENT_BORDER: Record<string, string> = {
  blue: 'border-l-4 border-l-blue-500',
  violet: 'border-l-4 border-l-violet-500',
  emerald: 'border-l-4 border-l-emerald-500',
};

function formatDelta(delta: number): string {
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0) return `+${abs} vs last week`;
  if (delta < 0) return `−${abs} vs last week`;
  return `${abs} vs last week`;
}

function deltaTextClass(delta: number): string {
  if (delta > 0) return 'text-green-600 dark:text-green-400';
  if (delta < 0) return 'text-amber-600 dark:text-amber-500';
  return 'text-slate-500 dark:text-slate-400';
}

export function PillarCard({
  label,
  averageScore,
  delta,
  sparklineData,
  color,
  isExpanded = false,
  onToggle,
  children,
}: PillarCardProps) {
  const accentClass = ACCENT_BORDER[color] ?? 'border-l-4 border-l-slate-300';
  const hasHistory = sparklineData.length > 0;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900 ${accentClass}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="flex items-center gap-2">
          <ScoreChip score={averageScore} scale="ten" />
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      <div className="mt-2 flex items-center gap-3">
        {hasHistory ? (
          <>
            <SparkLine data={sparklineData} width={80} height={24} />
            <span className={`text-sm ${deltaTextClass(delta)}`}>{formatDelta(delta)}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400">No history yet</span>
        )}
      </div>

      <div
        className={
          isExpanded
            ? 'mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'hidden'
        }
      >
        {children}
      </div>
    </div>
  );
}
