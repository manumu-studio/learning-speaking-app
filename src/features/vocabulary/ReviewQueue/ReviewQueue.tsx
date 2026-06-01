// Review queue — shows vocabulary items due for SRS review
'use client';

import { ReviewCard } from '../ReviewCard';
import type { ReviewQueueProps } from './ReviewQueue.types';
import { useReviewQueue } from './useReviewQueue';

export function ReviewQueue({ initialItems }: ReviewQueueProps) {
  const { items, isLoading, submittingId, submitRating } = useReviewQueue(initialItems);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl">✅</div>
        <p className="mt-3 text-lg font-medium text-gray-700 dark:text-gray-300">All caught up!</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No reviews due right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {items.length} item{items.length !== 1 ? 's' : ''} due for review
      </p>
      {items.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          onRate={submitRating}
          isSubmitting={submittingId === item.id}
        />
      ))}
    </div>
  );
}
