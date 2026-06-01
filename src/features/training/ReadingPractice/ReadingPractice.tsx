// Reading Practice Library — personalized practice texts based on pronunciation weaknesses + vocab gaps
'use client';

import { Container } from '@/components/ui/Container';
import { ScoreChip } from '@/components/ui/ScoreChip';
import { useReadingPractice } from './useReadingPractice';
import type { DifficultyLevel, ReadingPracticeSession, ReadingPracticeResult, WordScore } from './ReadingPractice.types';

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Easy', description: 'Simple sentences, common words' },
  { value: 'intermediate', label: 'Medium', description: 'Varied structures, mixed vocabulary' },
  { value: 'advanced', label: 'Hard', description: 'Complex sentences, academic tone' },
];

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

      {/* Loading */}
      {libraryLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* Error */}
      {libraryError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">{libraryError}</p>
        </div>
      )}

      {/* Library content */}
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

// --- Global Weakness Summary ---

function GlobalSummary({
  phonemes,
  unadoptedVocab,
}: {
  phonemes: ReadonlyArray<{ ipaSymbol: string; averageScore: number; exampleWords: string[] }>;
  unadoptedVocab: ReadonlyArray<{ word: string; meaning: string }>;
}) {
  if (phonemes.length === 0 && unadoptedVocab.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Your Focus Areas
      </h2>

      {phonemes.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Sounds to sharpen</p>
          <div className="flex flex-wrap gap-2">
            {phonemes.map((p) => (
              <span
                key={p.ipaSymbol}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 dark:bg-amber-900/30"
              >
                <span className="font-mono text-sm font-medium text-amber-800 dark:text-amber-200">
                  /{p.ipaSymbol}/
                </span>
                <ScoreChip score={p.averageScore} scale="hundred" />
              </span>
            ))}
          </div>
        </div>
      )}

      {unadoptedVocab.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Vocabulary to adopt ({unadoptedVocab.length} words)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unadoptedVocab.slice(0, 8).map((v) => (
              <span
                key={v.word}
                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                title={v.meaning}
              >
                {v.word}
              </span>
            ))}
            {unadoptedVocab.length > 8 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                +{unadoptedVocab.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Session Card ---

function SessionCard({
  session,
  onSelect,
}: {
  session: ReadingPracticeSession;
  onSelect: (session: ReadingPracticeSession) => void;
}) {
  const hasWeaknesses = session.weakPhonemes.length > 0 || session.mispronounced.length > 0;
  const date = new Date(session.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            #{session.workoutNumber}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {session.intentLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {session.pronScore !== null && (
            <ScoreChip score={session.pronScore} scale="hundred" />
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
        </div>
      </div>

      {hasWeaknesses ? (
        <div className="flex flex-wrap gap-1.5">
          {session.weakPhonemes.slice(0, 3).map((p) => (
            <span
              key={p.ipaSymbol}
              className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            >
              /{p.ipaSymbol}/
            </span>
          ))}
          {session.mispronounced.slice(0, 4).map((w) => (
            <span
              key={w.word}
              className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            >
              {w.word}
            </span>
          ))}
          {session.vocab.filter((v) => !v.adopted).slice(0, 2).map((v) => (
            <span
              key={v.word}
              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {v.word}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500">No pronunciation issues found</p>
      )}
    </button>
  );
}

// --- Practice View ---

function PracticeView({
  session,
  practiceState,
  generatedText,
  difficulty,
  error,
  result,
  recordingDuration,
  onGenerate,
  onStartRecording,
  onStopRecording,
  onBack,
}: {
  session: ReadingPracticeSession;
  practiceState: string;
  generatedText: { text: string; targetPhonemes: string[]; targetWords: string[] } | null;
  difficulty: DifficultyLevel;
  error: string | null;
  result: ReadingPracticeResult | null;
  recordingDuration: number;
  onGenerate: (level: DifficultyLevel) => void;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onBack: () => void;
}) {
  const isRecording = practiceState === 'recording';
  const isProcessing = practiceState === 'processing';
  const hasResults = practiceState === 'results' && result !== null;

  return (
    <Container className="max-w-2xl py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <span aria-hidden="true">&larr;</span> Back to library
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          #{session.workoutNumber} {session.intentLabel}
        </h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {session.weakPhonemes.map((p) => (
            <span
              key={p.ipaSymbol}
              className="rounded-full bg-amber-50 px-2.5 py-1 font-mono text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            >
              /{p.ipaSymbol}/
            </span>
          ))}
          {session.mispronounced.slice(0, 4).map((w) => (
            <span
              key={w.word}
              className="rounded-full bg-orange-50 px-2.5 py-1 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            >
              {w.word}
            </span>
          ))}
        </div>
      </div>

      {/* Difficulty selector — hidden once recording or results */}
      {!isRecording && !isProcessing && !hasResults && (
        <div className="mb-6 grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onGenerate(opt.value)}
              disabled={practiceState === 'loading'}
              className={`rounded-xl border p-3 text-left transition-colors ${
                difficulty === opt.value && generatedText
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              } disabled:opacity-50`}
            >
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                {opt.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Loading text generation */}
      {practiceState === 'loading' && (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-gray-500 animate-pulse dark:text-gray-400">
            Generating practice text...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
        </div>
      )}

      {/* Generated text display */}
      {generatedText && practiceState !== 'loading' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            {hasResults ? (
              <WordScoreDisplay wordScores={result.wordScores} />
            ) : (
              <p className="text-lg leading-relaxed text-gray-900 dark:text-gray-100">
                {generatedText.text}
              </p>
            )}
          </div>

          {/* Target indicators */}
          {!hasResults && (generatedText.targetPhonemes.length > 0 || generatedText.targetWords.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {generatedText.targetPhonemes.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-amber-100 px-2.5 py-1 font-mono text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                >
                  /{p}/
                </span>
              ))}
              {generatedText.targetWords.map((w) => (
                <span
                  key={w}
                  className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                >
                  {w}
                </span>
              ))}
            </div>
          )}

          {/* Results summary */}
          {hasResults && (
            <ResultsSummary result={result} />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50 py-4 dark:border-blue-800 dark:bg-blue-950/30">
              <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Recording... {Math.floor(recordingDuration)}s
              </span>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <span className="text-sm text-gray-500 animate-pulse dark:text-gray-400">
                Assessing pronunciation...
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isRecording && !isProcessing && (
              <button
                type="button"
                onClick={() => onGenerate(difficulty)}
                className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {hasResults ? 'Try Again' : 'New Text'}
              </button>
            )}

            {isRecording ? (
              <button
                type="button"
                onClick={() => void onStopRecording()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Stop & Assess
              </button>
            ) : !isProcessing && !hasResults && generatedText ? (
              <button
                type="button"
                onClick={() => void onStartRecording()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Record Reading
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Initial prompt */}
      {!generatedText && practiceState !== 'loading' && !error && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Choose a difficulty level above
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We&apos;ll generate a text targeting your weak sounds from this session
          </p>
        </div>
      )}
    </Container>
  );
}

// --- Word Score Display (color-coded per word) ---

function WordScoreDisplay({ wordScores }: { wordScores: WordScore[] }) {
  return (
    <p className="text-lg leading-relaxed">
      {wordScores.map((ws, i) => {
        const colorClass = getWordColorClass(ws.accuracyScore);
        return (
          <span key={i}>
            <span className={`${colorClass} ${ws.isTarget ? 'font-semibold underline decoration-dotted' : ''}`} title={`${Math.round(ws.accuracyScore)}%`}>
              {ws.word}
            </span>
            {i < wordScores.length - 1 && ' '}
          </span>
        );
      })}
    </p>
  );
}

function getWordColorClass(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-orange-600 dark:text-orange-400';
}

// --- Results Summary ---

function ResultsSummary({ result }: { result: ReadingPracticeResult }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900">
      <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score</span>
      <ScoreChip score={result.overallScore} scale="hundred" />
    </div>
  );
}

// --- Empty State ---

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
