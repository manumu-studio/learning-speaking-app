// AnnotatedTranscript: collapsible transcript viewer with inline sentence-level metric pins
'use client';

import React from 'react';
import { useAnnotatedTranscript } from './useAnnotatedTranscript';
import { PinBadge } from './PinBadge';
import type { AnnotatedTranscriptProps } from './AnnotatedTranscript.types';

export function AnnotatedTranscript({
  text,
  wordCount,
  insights,
  metrics,
  highlightedMetricKey,
  animationDelay,
}: AnnotatedTranscriptProps): React.JSX.Element {
  const { sentences, annotationMap, isExpanded, toggle } = useAnnotatedTranscript(
    text,
    insights,
    metrics,
  );

  const outerStyle =
    animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div
      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
      style={outerStyle}
    >
      <div
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={toggle}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">📝</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Transcript</span>
          {wordCount !== null && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
              {wordCount} words
            </span>
          )}
          {annotationMap.size > 0 && (
            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium px-2 py-0.5 rounded-full">
              {annotationMap.size} {annotationMap.size === 1 ? 'note' : 'notes'}
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          aria-label={isExpanded ? 'Hide transcript' : 'Show transcript'}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? '600px' : '0' }}
      >
        <div className="p-5 pt-0">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
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
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 rounded px-0.5'
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
        </div>
      </div>
    </div>
  );
}
