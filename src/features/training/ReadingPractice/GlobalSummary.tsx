// Global weakness summary — shows top weak phonemes and unadopted vocabulary
import { ScoreChip } from '@/components/ui/ScoreChip';

interface GlobalSummaryProps {
  phonemes: ReadonlyArray<{ ipaSymbol: string; averageScore: number; exampleWords: string[] }>;
  unadoptedVocab: ReadonlyArray<{ word: string; meaning: string }>;
}

export function GlobalSummary({ phonemes, unadoptedVocab }: GlobalSummaryProps) {
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
