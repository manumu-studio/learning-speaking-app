// Day detail view — meta-session with aggregated scores, wins, struggles, and sections
'use client';

import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { LanguageBankPanel } from '@/features/daily/LanguageBankPanel';
import { useDayDetailContent } from './useDayDetailContent';
import type { DayDetailContentProps } from './DayDetailContent.types';
import type { DailyResponse } from './useDayDetailContent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMinutes(totalSecs: number): string {
  const mins = Math.round(totalSecs / 60);
  return `${mins} min`;
}

function formatDelta(delta: number | null): string | null {
  if (delta === null) return null;
  return delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function DayDetailSkeleton() {
  return (
    <Container>
      <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800 mb-6" />
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse mb-4">
        <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-3" />
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mt-3" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-3 h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900" />
      ))}
    </Container>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function DayHero({ data }: { data: DailyResponse }) {
  return (
    <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-black">
      <div className="text-xs text-gray-500 uppercase tracking-wide">
        {formatFullDate(data.date)} · {data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''} · {formatMinutes(data.totalDurationSecs)}
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          {data.overallScore.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">Overall</span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {data.topicSentence}
      </p>
    </div>
  );
}

// ─── Speech Quality section ───────────────────────────────────────────────────

const PILLAR_LABELS: Record<'delivery' | 'language' | 'pronunciation', string> = {
  delivery: 'Delivery',
  language: 'Language',
  pronunciation: 'Pronunciation',
};

function SpeechQualitySection({ data }: { data: DailyResponse }) {
  const { conclusionData } = data;
  const pillars = (['delivery', 'language', 'pronunciation'] as const).map((key) => ({
    key,
    label: PILLAR_LABELS[key],
    score: conclusionData.pillarScores[key],
    delta: conclusionData.metricDeltas[key],
  }));

  return (
    <CollapsibleSection title="Speech Quality" defaultOpen animationDelay={100}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {pillars.map((pillar) => {
          const deltaStr = formatDelta(pillar.delta);
          return (
            <div key={pillar.key}>
              <div className="text-xs text-gray-500 dark:text-gray-400">{pillar.label}</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {pillar.score.toFixed(1)}
              </div>
              {deltaStr !== null && (
                <div className={`text-xs mt-0.5 ${pillar.delta !== null && pillar.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {deltaStr}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {conclusionData.wins.length > 0 && (
        <div className="space-y-1 mb-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wins</div>
          {conclusionData.wins.map((w) => (
            <div key={w.tag} className="text-sm text-gray-700 dark:text-gray-300">
              ✦ {w.detail}
            </div>
          ))}
        </div>
      )}

      {conclusionData.struggles.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Areas to work on</div>
          {conclusionData.struggles.map((s) => (
            <div key={s.tag} className="text-sm text-gray-700 dark:text-gray-300">
              · {s.detail} ({s.count}×)
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

// ─── Pronunciation section ────────────────────────────────────────────────────

function PronunciationSection({ data }: { data: DailyResponse }) {
  const delta = data.conclusionData.metricDeltas.pronunciation;
  const deltaStr = formatDelta(delta);
  const isPositive = delta !== null && delta > 0;

  return (
    <CollapsibleSection title="Pronunciation & Intonation" animationDelay={200}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Score</span>
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {data.pronunciationAvg.toFixed(1)}
        </span>
        {deltaStr !== null && (
          <span className={`text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {deltaStr}
          </span>
        )}
      </div>
      {/* TODO (44T-B): surface per-session PrioritySounds data at day level */}
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        Per-session pronunciation details are available in individual session views.
      </p>
    </CollapsibleSection>
  );
}

// ─── General Feedback section ─────────────────────────────────────────────────

function GeneralFeedbackSection({ data }: { data: DailyResponse }) {
  const { conclusionData, renderedFeedback } = data;

  return (
    <CollapsibleSection title="General Feedback" animationDelay={300}>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
        {renderedFeedback}
      </p>

      {conclusionData.keyInsights.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Key insights
          </div>
          {conclusionData.keyInsights.map((insight) => (
            <div key={insight} className="text-sm text-gray-600 dark:text-gray-400">
              · {insight}
            </div>
          ))}
        </div>
      )}

      {conclusionData.focusTomorrow.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Focus tomorrow
          </div>
          {conclusionData.focusTomorrow.map((f) => (
            <div key={f.tag} className="text-sm text-gray-600 dark:text-gray-400">
              → {f.tag}: {f.reason}
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

// ─── Use Tomorrow pills ───────────────────────────────────────────────────────

function UseTomorrowPills({ targets }: { targets: string[] }) {
  if (targets.length === 0) return null;

  return (
    <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Use tomorrow
      </div>
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <span
            key={t}
            className="text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DayDetailContent({ date }: DayDetailContentProps) {
  const { data, isLoading, error } = useDayDetailContent(date);

  if (isLoading) return <DayDetailSkeleton />;

  if (error !== null || data === null) {
    return (
      <Container>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Back to History
        </Link>
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {error ?? 'No data found for this day.'}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        ← Back to History
      </Link>

      <DayHero data={data} />

      <div className="mt-4 space-y-2">
        <SpeechQualitySection data={data} />
        <PronunciationSection data={data} />
        <GeneralFeedbackSection data={data} />
        <CollapsibleSection title="Language Bank" animationDelay={400}>
          <LanguageBankPanel dateKey={date} />
        </CollapsibleSection>
      </div>

      <UseTomorrowPills targets={data.conclusionData.activeTargetsTomorrow} />
    </Container>
  );
}
