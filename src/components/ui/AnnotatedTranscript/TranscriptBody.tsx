// TranscriptBody: renders annotated sentences with metric highlights and pin badges
'use client';

import React from 'react';
import { PinBadge } from './PinBadge';
import type { TranscriptBodyProps } from './TranscriptBody.types';

export function TranscriptBody({
  sentences,
  annotationMap,
  highlightedMetricKey,
}: TranscriptBodyProps): React.JSX.Element {
  return (
    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
      {sentences.map((sentence) => {
        const annotations = annotationMap.get(sentence.index) ?? [];
        const isHighlighted =
          highlightedMetricKey !== null &&
          highlightedMetricKey !== undefined &&
          annotations.some((a) =>
            a.category.toLowerCase().includes(highlightedMetricKey.toLowerCase()),
          );

        return (
          <React.Fragment key={sentence.index}>
            <span
              className={
                isHighlighted
                  ? 'rounded bg-indigo-50 px-0.5 dark:bg-indigo-900/20'
                  : undefined
              }
            >
              {sentence.text}
            </span>
            {annotations.map((annotation, i) => (
              <PinBadge key={`${annotation.insightId}-${i}`} annotation={annotation} />
            ))}{' '}
          </React.Fragment>
        );
      })}
    </p>
  );
}
