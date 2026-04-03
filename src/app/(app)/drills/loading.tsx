// Loading skeleton for drills page — shows placeholder drill cards
export default function DrillsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 h-8 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900"
          />
        ))}
      </div>
    </div>
  );
}
