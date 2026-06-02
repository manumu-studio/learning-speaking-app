// Loading state shown while the onboarding session is being processed
'use client';

import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import type { ProcessingStatusProps } from '@/components/ui/ProcessingStatus/ProcessingStatus.types';

const STATUS_MAP: Record<string, ProcessingStatusProps['status']> = {
  CREATED: 'CREATED',
  UPLOADED: 'UPLOADED',
  TRANSCRIBING: 'TRANSCRIBING',
  SCORING: 'SCORING',
  ANALYZING: 'ANALYZING',
  DONE: 'DONE',
  FAILED: 'FAILED',
};

interface VoiceProfileProcessingProps {
  status: string | null;
}

function resolveProcessingStatus(status: string | null): ProcessingStatusProps['status'] {
  if (status !== null && status in STATUS_MAP) {
    return STATUS_MAP[status] ?? 'UPLOADED';
  }
  return 'UPLOADED';
}

export function VoiceProfileProcessing({ status }: VoiceProfileProcessingProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
        Building your voice profile…
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
        This usually takes 15–30 seconds. Hang tight!
      </p>
      <ProcessingStatus status={resolveProcessingStatus(status)} />
    </div>
  );
}
