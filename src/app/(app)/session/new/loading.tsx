// Loading skeleton for new session page — shown during route transition
export default function NewSessionLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 mx-auto h-9 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />
    </div>
  );
}
