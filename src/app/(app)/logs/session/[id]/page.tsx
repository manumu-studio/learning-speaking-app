// Logs page for a single session — evidence register view
'use client';

import { use } from 'react';
import { Container } from '@/components/ui/Container';
import { EvidenceRegister, useEvidenceRegister } from '@/features/logs/EvidenceRegister';

export default function SessionLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { bundle, isLoading, error } = useEvidenceRegister(
    `/api/logs/session/${id}`,
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
          {error ?? 'No evidence found for this session.'}
        </p>
      </Container>
    );
  }

  return (
    <EvidenceRegister
      bundle={bundle}
      title="Evidence Register"
      subtitle={`Session ${id.slice(0, 8)}…`}
      backHref={`/session/${id}`}
    />
  );
}
