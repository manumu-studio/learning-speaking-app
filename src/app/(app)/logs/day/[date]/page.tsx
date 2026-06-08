// Logs page for a day — evidence register view
'use client';

import { use } from 'react';
import { Container } from '@/components/ui/Container';
import { EvidenceRegister, useEvidenceRegister } from '@/features/logs/EvidenceRegister';

export default function DayLogsPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const { bundle, isLoading, error } = useEvidenceRegister(
    `/api/logs/day/${date}`,
  );

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-sky-600" />
        </div>
      </Container>
    );
  }

  if (error !== null || bundle === null) {
    return (
      <Container>
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {error ?? 'No evidence found for this date.'}
        </p>
      </Container>
    );
  }

  return (
    <EvidenceRegister
      bundle={bundle}
      title="Evidence Register"
      subtitle={date}
      backHref={`/history/day/${date}`}
    />
  );
}
