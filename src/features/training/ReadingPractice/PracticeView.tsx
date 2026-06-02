// Practice view — text generation, recording, and results display for reading practice
import { Container } from '@/components/ui/Container';
import type {
  DifficultyLevel,
  ReadingPracticeResult,
  PracticeViewProps,
} from './ReadingPractice.types';
import {
  DifficultySelector,
  RecordingActionButtons,
  WordScoreDisplay,
  ResultsSummary,
} from './PracticeView.parts';

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

      <SessionHeader session={session} />

      {!isRecording && !isProcessing && !hasResults && (
        <DifficultySelector
          difficulty={difficulty}
          generatedText={generatedText}
          practiceState={practiceState}
          onGenerate={onGenerate}
        />
      )}

      {practiceState === 'loading' && <LoadingText />}

      {error && <ErrorBanner error={error} />}

      {generatedText && practiceState !== 'loading' && (
        <TextPanel
          generatedText={generatedText}
          hasResults={hasResults}
          result={result}
          isRecording={isRecording}
          isProcessing={isProcessing}
          recordingDuration={recordingDuration}
          difficulty={difficulty}
          onGenerate={onGenerate}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
        />
      )}

      {!generatedText && practiceState !== 'loading' && !error && <EmptyPrompt />}
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Local sub-components (small, stay in this file)
// ---------------------------------------------------------------------------

interface SessionHeaderProps {
  session: PracticeViewProps['session'];
}

function SessionHeader({ session }: SessionHeaderProps) {
  return (
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
  );
}

function LoadingText() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-sm text-gray-500 animate-pulse dark:text-gray-400">
        Generating practice text...
      </div>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
    </div>
  );
}

interface TextPanelProps {
  generatedText: { text: string; targetPhonemes: string[]; targetWords: string[] };
  hasResults: boolean;
  result: ReadingPracticeResult | null;
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  difficulty: DifficultyLevel;
  onGenerate: (level: DifficultyLevel) => void;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
}

function TextPanel({
  generatedText,
  hasResults,
  result,
  isRecording,
  isProcessing,
  recordingDuration,
  difficulty,
  onGenerate,
  onStartRecording,
  onStopRecording,
}: TextPanelProps) {
  const showTargetTags =
    !hasResults &&
    (generatedText.targetPhonemes.length > 0 || generatedText.targetWords.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        {hasResults && result ? (
          <WordScoreDisplay wordScores={result.wordScores} />
        ) : (
          <p className="text-lg leading-relaxed text-gray-900 dark:text-gray-100">
            {generatedText.text}
          </p>
        )}
      </div>

      {showTargetTags && (
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

      {hasResults && result && <ResultsSummary result={result} />}

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

      <RecordingActionButtons
        isRecording={isRecording}
        isProcessing={isProcessing}
        hasResults={hasResults}
        generatedText={generatedText}
        difficulty={difficulty}
        onGenerate={onGenerate}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Choose a difficulty level above
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        We&apos;ll generate a text targeting your weak sounds from this session
      </p>
    </div>
  );
}
