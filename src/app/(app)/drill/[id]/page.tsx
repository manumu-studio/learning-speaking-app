// Drill exercise page — Suspense boundary for DrillView
import { Suspense } from 'react';
import { DrillView } from '@/features/training/DrillView';

interface DrillPageProps {
  params: Promise<{ id: string }>;
}

function DrillSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-zinc-500 animate-pulse">Loading drill…</div>
    </div>
  );
}

export default async function DrillPage({ params }: DrillPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-zinc-900 py-8">
      <Suspense fallback={<DrillSkeleton />}>
        <DrillView drillId={id} />
      </Suspense>
    </main>
  );
}
