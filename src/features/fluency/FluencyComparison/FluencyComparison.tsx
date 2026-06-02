// FluencyComparison — side-by-side results for 4-3-2 fluency rounds with WPM bar chart
'use client';

import Link from 'next/link';
import type { FluencyComparisonProps } from './FluencyComparison.types';
import { useFluencyComparison } from './useFluencyComparison';
import { WpmBarChart } from './WpmBarChart';
import { ComparisonTable } from './ComparisonTable';

export function FluencyComparison({
  fluencySessionId,
  promptTitle,
  rounds: initialRounds,
}: FluencyComparisonProps) {
  const { rounds, deltas, isProcessing, motivationalMessage } =
    useFluencyComparison({ fluencySessionId, initialRounds });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Fluency Breakdown
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{promptTitle}</p>
      </div>

      {isProcessing && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          Some metrics are still being processed. Results will update automatically.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Speech Rate
        </h3>
        <WpmBarChart rounds={rounds} />
      </div>

      <ComparisonTable rounds={rounds} deltas={deltas} />

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {motivationalMessage}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/fluency-training"
          className="rounded-xl bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Try Another Prompt
        </Link>
        <Link
          href={`/fluency-training/${fluencySessionId}`}
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          View Session Details
        </Link>
      </div>
    </div>
  );
}
