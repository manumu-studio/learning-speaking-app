// AnnotatedTranscript: collapsible transcript viewer with inline sentence-level metric pins
'use client';

import React from 'react';
import { useAnnotatedTranscript } from './useAnnotatedTranscript';
import { TranscriptBody } from './TranscriptBody';
import { TranscriptHeader } from './TranscriptHeader';
import type { AnnotatedTranscriptProps } from './AnnotatedTranscript.types';

export function AnnotatedTranscript({
  text,
  wordCount,
  insights,
  metrics,
  highlightedMetricKey,
  animationDelay,
  embedded = false,
}: AnnotatedTranscriptProps): React.JSX.Element {
  const { sentences, annotationMap, isExpanded, toggle } = useAnnotatedTranscript(
    text,
    insights,
    metrics,
  );

  const outerStyle =
    animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  if (embedded) {
    return (
      <div style={outerStyle}>
        <TranscriptBody
          sentences={sentences}
          annotationMap={annotationMap}
          highlightedMetricKey={highlightedMetricKey}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
      style={outerStyle}
    >
      <TranscriptHeader
        wordCount={wordCount}
        annotationCount={annotationMap.size}
        isExpanded={isExpanded}
        onToggle={toggle}
      />

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? '600px' : '0' }}
      >
        <div className="p-5 pt-0">
          <TranscriptBody
            sentences={sentences}
            annotationMap={annotationMap}
            highlightedMetricKey={highlightedMetricKey}
          />
        </div>
      </div>
    </div>
  );
}
