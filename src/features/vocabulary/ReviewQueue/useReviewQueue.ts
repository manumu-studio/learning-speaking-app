// Fetch and manage the SRS review queue
'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { ReviewCardItemSchema } from '../vocabulary.schemas';
import type { ReviewCardItem, ReviewRatingLabel } from '../ReviewCard';

const ReviewQueueResponseSchema = z.array(ReviewCardItemSchema);

export function useReviewQueue(initialItems?: ReviewCardItem[]) {
  const [items, setItems] = useState<ReviewCardItem[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(initialItems === undefined);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems !== undefined) return;

    async function fetchQueue() {
      try {
        const res = await fetch('/api/users/me/vocabulary/review-queue');
        if (!res.ok) return;
        const json: unknown = await res.json();
        const parsed = ReviewQueueResponseSchema.safeParse(json);
        if (parsed.success) {
          setItems(parsed.data);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void fetchQueue();
  }, [initialItems]);

  const submitRating = useCallback(async (id: string, rating: ReviewRatingLabel) => {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/users/me/vocabulary/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } finally {
      setSubmittingId(null);
    }
  }, []);

  return { items, isLoading, submittingId, submitRating };
}
