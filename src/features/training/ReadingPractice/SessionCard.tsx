// Session card — displays a past session with its weak phonemes and mispronounced words
import { ScoreChip } from '@/components/ui/ScoreChip';
import type { ReadingPracticeSession } from './ReadingPractice.types';

interface SessionCardProps {
  session: ReadingPracticeSession;
  onSelect: (session: ReadingPracticeSession) => void;
}

export function SessionCard({ session, onSelect }: SessionCardProps) {
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
