// Loading skeleton for history page — shows placeholder list items
export default function HistoryLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 h-8 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900"
          />
        ))}
      </div>
    </div>
  );
}
