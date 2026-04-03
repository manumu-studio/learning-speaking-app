// Loading skeleton for dashboard page — shows placeholder UI during data fetch
export default function DashboardLoading() {
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
