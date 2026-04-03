// App Router error boundary for authenticated routes — catches unhandled errors and offers recovery
'use client';

import type { AppRouterErrorProps } from '@/components/ui/ErrorBoundary/ErrorBoundary.types';

export default function AppError({ error, reset }: AppRouterErrorProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black"
        aria-label="Try again to recover from error"
      >
        Try again
      </button>
    </div>
  );
}
