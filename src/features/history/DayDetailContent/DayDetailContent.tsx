// Day detail view — renders a completed day as a five-section meta-session
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Container } from '@/components/ui/Container';
import { PhonemeDetail } from '@/components/ui/PhonemeDetail';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import { useDayDetailContent } from './useDayDetailContent';
import type { DayDetailContentProps } from './DayDetailContent.types';
import type {
  DayDetailData,
  DayFeedbackItem,
  DayTranscriptSession,
  DayTranscriptToken,
} from '@/lib/daily/dayDetail/buildDayDetailData.types';

function formatFullDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMinutes(totalSecs: number): string {
  return `${Math.round(totalSecs / 60)} min`;
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

function DayHero({ data }: { data: DayDetailData }) {
  return (
    <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-black">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {formatFullDate(data.hero.date)} · {data.hero.sessionCount} session{data.hero.sessionCount === 1 ? '' : 's'} · {formatMinutes(data.hero.totalDurationSecs)}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">
          {data.hero.overallScore?.toFixed(1) ?? '--'}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Overall</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">{data.hero.totalWords} words</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {data.hero.topicSentence}
      </p>
      {data.hero.focusAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.hero.focusAreas.map((area) => (
            <span key={area} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {area}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function FeedbackItems({ items }: { items: readonly DayFeedbackItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={`${item.title}-${item.detail}`} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/60">
          <div className="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{item.detail}</p>
          {item.evidence !== null && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{item.evidence}</p>}
        </li>
      ))}
    </ul>
  );
}

function SessionsSection({ data }: { data: DayDetailData }) {
  return (
    <CollapsibleSection title="Sessions" defaultOpen count={data.sessions.length}>
      <ul className="space-y-2">
        {data.sessions.map((session) => (
          <li key={session.id}>
            <Link href={session.href} className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Session {session.sessionNumber} · {session.timeLabel}
                </span>
                <span className="text-xs text-gray-400">{formatMinutes(session.durationSecs)}</span>
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

function CategorySection({ data, kind }: { data: DayDetailData; kind: 'speech' | 'pronunciation' }) {
  const section = kind === 'speech' ? data.speechQuality : data.pronunciation;
  const title = kind === 'speech' ? 'Speech Quality' : 'Pronunciation & Intonation';
  return (
    <CollapsibleSection title={title} defaultOpen={kind === 'speech'} count={section.categories.length}>
      <div className="space-y-4">
        {section.categories.map((category) => (
          <div key={category.key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-800">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{category.label}</h3>
              {category.score !== null && <span className="text-sm text-gray-500">{category.score.toFixed(1)}</span>}
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{category.summary}</p>
            <FeedbackItems items={category.items} />
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function GeneralFeedbackSection({ data }: { data: DayDetailData }) {
  const feedback = data.generalFeedback;
  return (
    <CollapsibleSection title="General Feedback">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {feedback.summary || feedback.emptyState || 'No day-level feedback is available yet.'}
      </p>
      {feedback.activeTargets.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {feedback.activeTargets.map((target) => (
            <span key={target.text} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {target.text}
            </span>
          ))}
        </div>
      )}
      <FeedbackItems items={feedback.suggestionWords.map((word) => ({
        title: word.text,
        detail: word.reason,
        tone: 'neutral',
        evidence: word.family,
      }))} />
    </CollapsibleSection>
  );
}

function toWordPronunciation(token: DayTranscriptToken): WordPronunciation | null {
  if (token.pronunciation === null) return null;
  return {
    word: token.text,
    display: token.pronunciation.display,
    accuracyScore: token.pronunciation.accuracyScore,
    errorType: token.pronunciation.errorType,
    offsetMs: 0,
    durationMs: 0,
    phonemes: token.pronunciation.phonemes,
    l1Tags: token.pronunciation.l1Tags,
    breakErrorTypes: token.pronunciation.breakErrorTypes,
    intonationErrorTypes: token.pronunciation.intonationErrorTypes,
    monotonePitchDelta: token.pronunciation.monotonePitchDelta,
  };
}

function TranscriptSession({ session }: { session: DayTranscriptSession }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const mode = session.modes[0];
  if (mode === undefined) return null;
  return (
    <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{session.title}</h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{session.topic}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {mode.tokens.map((token, index) => {
          const word = toWordPronunciation(token);
          if (word === null) return <span key={`${token.text}-${index}`}>{token.text}</span>;
          return (
            <button key={`${token.text}-${index}`} type="button" className="rounded px-0.5 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30" onClick={() => setExpandedIndex(index)}>
              {token.text}
            </button>
          );
        })}
      </p>
      {expandedIndex !== null && mode.tokens[expandedIndex] !== undefined && (
        <div className="mt-3">
          <PhonemeDetail word={toWordPronunciation(mode.tokens[expandedIndex]) ?? {
            word: '',
            accuracyScore: 0,
            errorType: 'None',
            offsetMs: 0,
            durationMs: 0,
            phonemes: [],
            l1Tags: [],
            breakErrorTypes: [],
            intonationErrorTypes: [],
            monotonePitchDelta: null,
          }} onClose={() => setExpandedIndex(null)} />
        </div>
      )}
    </div>
  );
}

function TranscriptSection({ data }: { data: DayDetailData }) {
  return (
    <CollapsibleSection title="Transcript" count={data.transcript.sessions.length}>
      <div className="space-y-3">
        {data.transcript.sessions.map((session) => (
          <TranscriptSession key={session.sessionId} session={session} />
        ))}
        {data.transcript.emptyState !== null && <p className="text-sm text-gray-500">{data.transcript.emptyState}</p>}
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
        <TranscriptSection data={data} />
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
