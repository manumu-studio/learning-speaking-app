// Loading skeleton for session cards
export function SessionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-24 rounded bg-gray-200" />
          </div>
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>
        <div className="h-8 w-16 rounded bg-gray-200" />
      </div>
    </div>
  );
}
