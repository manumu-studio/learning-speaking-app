// Dashboard page — server component with Suspense boundary for DashboardView
import { Suspense } from 'react';
import { DashboardView } from '@/features/dashboard/DashboardView';

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900"
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Track your speaking patterns and set training focus areas.
      </p>
      <div className="mt-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardView />
        </Suspense>
      </div>
    </main>
  );
}
