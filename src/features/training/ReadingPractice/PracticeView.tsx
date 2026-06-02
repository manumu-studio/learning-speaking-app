// Practice view — text generation, recording, and results display for reading practice
/* eslint-disable complexity, max-lines-per-function */
import { Container } from '@/components/ui/Container';
import { ScoreChip } from '@/components/ui/ScoreChip';
import type { DifficultyLevel, ReadingPracticeSession, ReadingPracticeResult, WordScore } from './ReadingPractice.types';

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Easy', description: 'Simple sentences, common words' },
  { value: 'intermediate', label: 'Medium', description: 'Varied structures, mixed vocabulary' },
  { value: 'advanced', label: 'Hard', description: 'Complex sentences, academic tone' },
];

interface PracticeViewProps {
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
}

export function PracticeView({
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
}: PracticeViewProps) {
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

      {!isRecording && !isProcessing && !hasResults && (
        <DifficultySelector
          difficulty={difficulty}
          generatedText={generatedText}
          practiceState={practiceState}
          onGenerate={onGenerate}
        />
      )}

      {practiceState === 'loading' && (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-gray-500 animate-pulse dark:text-gray-400">
            Generating practice text...
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
        </div>
      )}

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

          {hasResults && <ResultsSummary result={result} />}

          {isRecording && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50 py-4 dark:border-blue-800 dark:bg-blue-950/30">
              <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Recording... {Math.floor(recordingDuration)}s
              </span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <span className="text-sm text-gray-500 animate-pulse dark:text-gray-400">
                Assessing pronunciation...
              </span>
            </div>
          )}

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

function DifficultySelector({
  difficulty,
  generatedText,
  practiceState,
  onGenerate,
}: {
  difficulty: DifficultyLevel;
  generatedText: { text: string } | null;
  practiceState: string;
  onGenerate: (level: DifficultyLevel) => void;
}) {
  return (
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
  );
}

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

function ResultsSummary({ result }: { result: ReadingPracticeResult }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900">
      <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score</span>
      <ScoreChip score={result.overallScore} scale="hundred" />
    </div>
  );
}
