// Root error boundary — catch-all for unhandled errors outside route group boundaries
'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error for debugging (no external monitoring yet)
  console.error('[RootError]', error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 dark:bg-black">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-offset-black"
      >
        Try again
      </button>
    </div>
  );
}
