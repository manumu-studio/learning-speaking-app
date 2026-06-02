// TranscriptHeader: collapsible header row for the AnnotatedTranscript card
'use client';

import type { TranscriptHeaderProps } from './TranscriptHeader.types';

export function TranscriptHeader({
  wordCount,
  annotationCount,
  isExpanded,
  onToggle,
}: TranscriptHeaderProps) {
  return (
    <div
      className="p-5 flex items-center justify-between cursor-pointer"
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
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
        {annotationCount > 0 && (
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium px-2 py-0.5 rounded-full">
            {annotationCount} {annotationCount === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>
      <button
        type="button"
        className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={isExpanded ? 'Hide transcript' : 'Show transcript'}
      >
        {isExpanded ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
