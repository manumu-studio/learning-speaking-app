// Loading skeleton for insight cards
export function InsightCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-gray-200" />
          <div className="h-2 w-2 rounded-full bg-gray-200" />
        </div>
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
      </div>
    </div>
  );
}
