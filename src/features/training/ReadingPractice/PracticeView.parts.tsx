// PracticeView sub-components — difficulty selector, text panel, recording controls
import { ScoreChip } from '@/components/ui/ScoreChip';
import type { DifficultyLevel, ReadingPracticeResult, WordScore } from './ReadingPractice.types';

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Easy', description: 'Simple sentences, common words' },
  { value: 'intermediate', label: 'Medium', description: 'Varied structures, mixed vocabulary' },
  { value: 'advanced', label: 'Hard', description: 'Complex sentences, academic tone' },
];

export interface DifficultySelectorProps {
  difficulty: DifficultyLevel;
  generatedText: { text: string } | null;
  practiceState: string;
  onGenerate: (level: DifficultyLevel) => void;
}

export function DifficultySelector({
  difficulty,
  generatedText,
  practiceState,
  onGenerate,
}: DifficultySelectorProps) {
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

export interface RecordingActionButtonsProps {
  isRecording: boolean;
  isProcessing: boolean;
  hasResults: boolean;
  generatedText: { text: string } | null;
  difficulty: DifficultyLevel;
  onGenerate: (level: DifficultyLevel) => void;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
}

export function RecordingActionButtons({
  isRecording,
  isProcessing,
  hasResults,
  generatedText,
  difficulty,
  onGenerate,
  onStartRecording,
  onStopRecording,
}: RecordingActionButtonsProps) {
  return (
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
  );
}

function getWordColorClass(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-orange-600 dark:text-orange-400';
}

export function WordScoreDisplay({ wordScores }: { wordScores: WordScore[] }) {
  return (
    <p className="text-lg leading-relaxed">
      {wordScores.map((ws, i) => {
        const colorClass = getWordColorClass(ws.accuracyScore);
        return (
          <span key={i}>
            <span
              className={`${colorClass} ${ws.isTarget ? 'font-semibold underline decoration-dotted' : ''}`}
              title={`${Math.round(ws.accuracyScore)}%`}
            >
              {ws.word}
            </span>
            {i < wordScores.length - 1 && ' '}
          </span>
        );
      })}
    </p>
  );
}

export function ResultsSummary({ result }: { result: ReadingPracticeResult }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-900">
      <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score</span>
      <ScoreChip score={result.overallScore} scale="hundred" />
    </div>
  );
}
