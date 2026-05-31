// Reading Practice page — AI generates text targeting weak sounds for read-aloud practice
import { Suspense } from 'react';
import { ReadingPractice } from '@/features/training/ReadingPractice';

function ReadingPracticeSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-zinc-500 animate-pulse">Loading practice...</div>
    </div>
  );
}

export default function ReadingPracticePage() {
  return (
    <div className="min-h-dvh bg-white py-8 dark:bg-black">
      <Suspense fallback={<ReadingPracticeSkeleton />}>
        <ReadingPractice />
      </Suspense>
    </div>
  );
}
