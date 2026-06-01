// Reading Practice Library — personalized practice texts based on pronunciation weaknesses + vocab gaps
'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { DailySummaryCard } from '@/features/history/DailySummaryCard';
import { useReadingPractice } from './useReadingPractice';
import { PracticeView } from './PracticeView';
import { GlobalSummary } from './GlobalSummary';
import { SessionCard } from './SessionCard';
import type { ReadingPracticeSession } from './ReadingPractice.types';

interface SessionDayGroup {
  dayLabel: string;
  dateKey: string;
  isToday: boolean;
  sessions: ReadingPracticeSession[];
}

function groupByDay(sessions: ReadingPracticeSession[]): SessionDayGroup[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const map = new Map<string, SessionDayGroup>();

  for (const session of sessions) {
    const date = new Date(session.createdAt);
    const dateKey = date.toISOString().split('T')[0] as string;
    const existing = map.get(dateKey);

    if (existing !== undefined) {
      existing.sessions.push(session);
    } else {
      let dayLabel: string;
      if (isSameDay(date, today)) dayLabel = 'Today';
      else if (isSameDay(date, yesterday)) dayLabel = 'Yesterday';
      else dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      map.set(dateKey, {
        dayLabel,
        dateKey,
        isToday: isSameDay(date, today),
        sessions: [session],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function ReadingPractice() {
  const {
    view,
    libraryData,
    libraryLoading,
    libraryError,
    selectedSession,
    selectSession,
    backToLibrary,
    practiceState,
    generatedText,
    difficulty,
    practiceError,
    result,
    generateForSession,
    recordingDuration,
    startRecording,
    stopRecording,
  } = useReadingPractice();

  if (view === 'practice' && selectedSession) {
    return (
      <PracticeView
        session={selectedSession}
        practiceState={practiceState}
        generatedText={generatedText}
        difficulty={difficulty}
        error={practiceError}
        result={result}
        recordingDuration={recordingDuration}
        onGenerate={generateForSession}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onBack={backToLibrary}
      />
    );
  }

  return (
    <Container className="max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reading Practice
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Practice texts designed around your pronunciation weaknesses
        </p>
      </div>

      {libraryLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {libraryError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">{libraryError}</p>
        </div>
      )}

      {libraryData && !libraryLoading && (
        <div className="space-y-8">
          <GlobalSummary
            phonemes={libraryData.globalWeaknesses.phonemes}
            unadoptedVocab={libraryData.globalWeaknesses.unadoptedVocab}
          />

          {libraryData.sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Practice by Session
              </h2>
              {groupByDay(libraryData.sessions).map((group) => (
                <ReadingDayGroup
                  key={group.dateKey}
                  group={group}
                  onSelect={selectSession}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

function ReadingDayGroup({
  group,
  onSelect,
}: {
  group: SessionDayGroup;
  onSelect: (session: ReadingPracticeSession) => void;
}) {
  const [expanded, setExpanded] = useState(group.isToday);
  const count = group.sessions.length;
  const countLabel = count === 1 ? '1 session' : `${count} sessions`;

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 pl-1 flex items-center gap-2">
        <span>{group.dayLabel}</span>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
        <span>{countLabel}</span>
      </h3>

      <DailySummaryCard dateKey={group.dateKey} />

      {!group.isToday && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-2 pl-1"
        >
          {expanded ? 'Hide sessions' : `Show ${countLabel}`}
        </button>
      )}

      {expanded && (
        <div className="space-y-3">
          {group.sessions.map((session) => (
            <SessionCard key={session.id} session={session} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        No sessions with pronunciation data yet
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Complete a speaking session to get personalized reading practice
      </p>
    </div>
  );
}
