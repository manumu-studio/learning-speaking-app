'use client';
// Collapsible transcript viewer with smooth expand/collapse animation
import { useTranscriptSection } from './useTranscriptSection';
import type { TranscriptSectionProps } from './TranscriptSection.types';

export function TranscriptSection({ text, wordCount, animationDelay }: TranscriptSectionProps) {
  const { isExpanded, toggle } = useTranscriptSection();
  const outerStyle = animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div
      className="rounded-xl bg-white border border-gray-200 shadow-sm"
      style={outerStyle}
    >
      {/* Header — always visible */}
      <div
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={toggle}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">📝</span>
          <span className="font-semibold text-gray-900 text-sm">Transcript</span>
          {wordCount !== null && (
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {wordCount} words
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
          onClick={toggle}
          aria-label={isExpanded ? 'Hide transcript' : 'Show transcript'}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Collapsible transcript body */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? '500px' : '0' }}
      >
        <div className="p-5 pt-0">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  );
}
