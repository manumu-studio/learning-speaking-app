// Day detail view — renders a completed day as a five-section meta-session
'use client';

import Link from 'next/link';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Container } from '@/components/ui/Container';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { useDayDetailContent } from './useDayDetailContent';
import type { DayDetailContentProps } from './DayDetailContent.types';
import { TranscriptMapTabs } from './DayTranscriptSections';
import { GeneralFeedbackSection } from './DayGeneralFeedbackSection';
import type {
  DayDetailData,
  DayFeedbackItem,
  DayTranscriptSession,
} from '@/lib/daily/dayDetail/buildDayDetailData.types';

function formatFullDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StatColumn({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-15">
      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function DayDetailSkeleton() {
  return (
    <Container>
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mb-4 rounded-lg border border-gray-200 p-6 dark:border-gray-800">
        <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900" />
        ))}
      </div>
    </Container>
  );
}

const PILLAR_LABELS = { delivery: 'Delivery', language: 'Language', pronunciation: 'Pronunciation' } as const;
const PILLAR_KEYS: (keyof typeof PILLAR_LABELS)[] = ['delivery', 'language', 'pronunciation'];

function DayHero({ data }: { data: DayDetailData }) {
  const { hero } = data;
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
        {formatFullDate(hero.date)}
      </p>

      <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-5">
        {hero.topicSentence}
      </p>

      <div className="flex items-center gap-6 flex-wrap">
        <StatColumn value={formatDuration(hero.totalDurationSecs)} label="mins" />
        <StatColumn value={hero.totalWords > 0 ? String(hero.totalWords) : '--'} label="words" />
        <StatColumn value={String(hero.sessionCount)} label="sessions" />
        <StatColumn value={hero.overallScore?.toFixed(1) ?? '--'} label="overall" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {PILLAR_KEYS.map((key) => {
          const score = hero.pillarScores[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/60"
            >
              <span className="text-xs font-medium text-slate-500 dark:text-sky-300/70">
                {PILLAR_LABELS[key]}
              </span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {score !== null && score > 0 ? score.toFixed(1) : '—'}
              </span>
              {score !== null && score > 0 && <ScoreChip score={score} scale="ten" />}
            </div>
          );
        })}
      </div>

      {hero.focusAreas.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {hero.focusAreas.map((area) => (
            <span key={area} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {area}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

const TONE_STYLES = {
  good: 'border-l-emerald-400 bg-emerald-50/50 dark:border-l-emerald-600 dark:bg-emerald-950/20',
  watch: 'border-l-amber-400 bg-amber-50/50 dark:border-l-amber-600 dark:bg-amber-950/20',
  neutral: 'border-l-gray-300 bg-gray-50 dark:border-l-gray-600 dark:bg-gray-900/60',
} satisfies Record<string, string>;

const TONE_ICONS = { good: '✓', watch: '⚠', neutral: '·' } satisfies Record<string, string>;

function FeedbackItems({ items }: { items: readonly DayFeedbackItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => {
        const style = TONE_STYLES[item.tone] ?? TONE_STYLES.neutral;
        const icon = TONE_ICONS[item.tone] ?? TONE_ICONS.neutral;
        return (
          <li key={`${item.title}-${item.detail}`} className={`rounded-lg border-l-4 p-3 text-sm ${style}`}>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs opacity-60">{icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
                <p className="mt-0.5 text-gray-600 dark:text-gray-400">{item.detail}</p>
                {item.evidence !== null && (
                  <p className="mt-1 text-xs italic text-gray-400 dark:text-gray-500">&ldquo;{item.evidence}&rdquo;</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 7
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : score >= 4
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function SessionsSection({ data }: { data: DayDetailData }) {
  return (
    <CollapsibleSection title="Sessions" defaultOpen count={data.sessions.length}>
      <ul className="space-y-2">
        {data.sessions.map((session) => (
          <li key={session.id}>
            <Link href={session.href} className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Session {session.sessionNumber} · {session.timeLabel}
                </span>
                <span className="text-xs text-gray-400">{Math.round(session.durationSecs / 60)} min</span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{session.topic}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                {session.pronunciationMetric !== null && <span>{session.pronunciationMetric.label}: {session.pronunciationMetric.value}</span>}
                {session.speechMetric !== null && <span>{session.speechMetric.label}: {session.speechMetric.value}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}

type AnyDayCategory =
  | DayDetailData['pronunciation']['categories'][number]
  | DayDetailData['speechQuality']['categories'][number];

function CategorySection({ data, kind }: { data: DayDetailData; kind: 'speech' | 'pronunciation' }) {
  const section = kind === 'speech' ? data.speechQuality : data.pronunciation;
  const title = kind === 'speech' ? 'Speech Quality' : 'Pronunciation & Intonation';
  const hasTranscriptMap = kind === 'pronunciation' && data.transcript.sessions.length > 0;
  return (
    <CollapsibleSection title={title} defaultOpen={kind === 'speech'} count={section.categories.length}>
      <div className="space-y-2">
        {section.categories.map((category) => (
          <PronunciationCategorySlot
            key={category.key}
            category={category}
            transcriptAfter={hasTranscriptMap && category.key === 'scoreSummary'}
            transcriptSessions={data.transcript.sessions}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function PronunciationCategorySlot({
  category,
  transcriptAfter,
  transcriptSessions,
}: {
  category: AnyDayCategory;
  transcriptAfter: boolean;
  transcriptSessions: readonly DayTranscriptSession[];
}) {
  return (
    <>
      <CategoryCard category={category} />
      {transcriptAfter && (
        <CollapsibleSection title="Transcript Map" defaultOpen={false}>
          <TranscriptMapTabs transcriptSessions={transcriptSessions} />
        </CollapsibleSection>
      )}
    </>
  );
}

function CategoryCard({ category }: { category: AnyDayCategory }) {
  return (
    <CollapsibleSection
      title={category.label}
      defaultOpen={false}
      extra={<ScoreBadge score={category.score} />}
    >
      <div className="space-y-2">
        {category.summary.length > 0 && (
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{category.summary}</p>
        )}
        <FeedbackItems items={category.items} />
        {category.items.length === 0 && category.summary.length === 0 && category.emptyState !== null && (
          <p className="text-sm italic text-gray-400 dark:text-gray-500">{category.emptyState}</p>
        )}
      </div>
    </CollapsibleSection>
  );
}


export function DayDetailContent({ date }: DayDetailContentProps) {
  const { data, isLoading, error } = useDayDetailContent(date);
  if (isLoading) return <DayDetailSkeleton />;
  if (error !== null || data === null) {
    return (
      <Container>
        <BackLink />
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">{error ?? 'No data found for this day.'}</p>
      </Container>
    );
  }
  return (
    <Container>
      <BackLink />
      <DayHero data={data} />
      <div className="mt-4 space-y-2">
        <SessionsSection data={data} />
        <CategorySection data={data} kind="speech" />
        <CategorySection data={data} kind="pronunciation" />
        <GeneralFeedbackSection data={data} />
      </div>
      <div className="mt-6 text-center">
        <Link
          href={`/logs/day/${date}`}
          className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          View evidence →
        </Link>
      </div>
    </Container>
  );
}

function BackLink() {
  return (
    <Link href="/history" className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
      ← Back to History
    </Link>
  );
}
