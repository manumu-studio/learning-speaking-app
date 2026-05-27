// Shows how many recordings the user has made today with a link to history
'use client';

import Link from 'next/link';
import type { RecordingContextProps } from './RecordingContext.types';

export function RecordingContext({
  todaySessionCount,
  nextRecordingNumber,
  isLoading,
}: RecordingContextProps) {
  if (isLoading || todaySessionCount <= 0) {
    return null;
  }

  return (
    <div className="flex w-full items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
      <p>
        Recording{' '}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {nextRecordingNumber}
        </span>{' '}
        of today
      </p>
      <Link
        href="/history"
        className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        View recent
      </Link>
    </div>
  );
}
