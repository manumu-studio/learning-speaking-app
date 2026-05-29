// Training history page — Suspense boundary for DrillHistoryView
import { Suspense } from 'react';
import { DrillHistoryView } from '@/features/training/DrillHistoryView';

function DrillsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-gray-700" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="mb-3 h-20 animate-pulse rounded-xl bg-zinc-800"
        />
      ))}
    </div>
  );
}

export default function DrillsPage() {
  return (
    <div className="min-h-screen bg-zinc-900 py-8">
      <Suspense fallback={<DrillsSkeleton />}>
        <DrillHistoryView />
      </Suspense>
    </div>
  );
}
