// Loading UI for protected routes — centered spinner while segments load
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 bg-white dark:bg-gray-950">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  );
}
