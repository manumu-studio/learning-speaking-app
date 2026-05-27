// PersonalRecordStrip — horizontal scrollable row of all-time personal bests
import type { PersonalRecord } from '@/lib/personalRecords.types';
import type { PersonalRecordStripProps } from './PersonalRecordStrip.types';

function PRPill({ record }: { record: PersonalRecord }) {
  const date = new Date(record.sessionDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex-shrink-0 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-3 py-1.5 text-xs">
      <span className="font-semibold text-amber-800 dark:text-amber-300">
        {record.metricLabel}
      </span>
      <span className="mx-1.5 text-amber-400 dark:text-amber-600">·</span>
      <span className="text-amber-700 dark:text-amber-400">
        {record.score.toFixed(1)}
      </span>
      <span className="ml-1.5 text-amber-500 dark:text-amber-500 opacity-75">
        ({date})
      </span>
    </div>
  );
}

export function PersonalRecordStrip({ personalRecords }: PersonalRecordStripProps) {
  if (personalRecords.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
        Personal Bests
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {personalRecords.map((pr) => (
          <PRPill key={pr.metricKey} record={pr} />
        ))}
      </div>
    </div>
  );
}
