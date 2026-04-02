// App Router error boundary for authenticated routes
'use client';

import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
