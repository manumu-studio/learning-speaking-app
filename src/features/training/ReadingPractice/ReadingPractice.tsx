// Reading Practice Library — personalized practice texts based on pronunciation weaknesses + vocab gaps
'use client';

import { Container } from '@/components/ui/Container';
import { useReadingPractice } from './useReadingPractice';
import { PracticeView } from './PracticeView';
import { GlobalSummary } from './GlobalSummary';
import { SessionCard } from './SessionCard';

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
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Practice by Session
              </h2>
              {libraryData.sessions.map((session) => (
                <SessionCard key={session.id} session={session} onSelect={selectSession} />
              ))}
            </div>
          )}
        </div>
      )}
    </Container>
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
