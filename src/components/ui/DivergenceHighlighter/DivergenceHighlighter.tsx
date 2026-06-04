// Renders a transcript with divergence spans highlighted by type
'use client';

import { useMemo } from 'react';
import type { DivergenceSpan } from '@/lib/analysis/divergence/divergence.types';
import type { DivergenceHighlighterProps } from './DivergenceHighlighter.types';

const HIGHLIGHT_CLASSES: Record<DivergenceSpan['type'], string> = {
  insertion: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  deletion: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  substitution: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

function getRelevantSpans(spans: DivergenceSpan[], side: 'verbatim' | 'normalized'): DivergenceSpan[] {
  return spans.filter((span) => {
    if (side === 'verbatim') return span.type === 'insertion' || span.type === 'substitution';
    return span.type === 'deletion' || span.type === 'substitution';
  });
}

function getSpanText(span: DivergenceSpan, side: 'verbatim' | 'normalized'): string {
  return side === 'verbatim' ? span.verbatimText : span.normalizedText;
}

interface TextSegment {
  text: string;
  type: DivergenceSpan['type'] | null;
}

function buildSegments(text: string, spans: DivergenceSpan[], side: 'verbatim' | 'normalized'): TextSegment[] {
  const relevant = getRelevantSpans(spans, side);
  if (relevant.length === 0) return [{ text, type: null }];

  const segments: TextSegment[] = [];
  let searchFrom = 0;

  for (const span of relevant) {
    const spanText = getSpanText(span, side);
    if (spanText.length === 0) continue;

    const idx = text.toLowerCase().indexOf(spanText.toLowerCase(), searchFrom);
    if (idx === -1) continue;

    if (idx > searchFrom) {
      segments.push({ text: text.slice(searchFrom, idx), type: null });
    }
    segments.push({ text: text.slice(idx, idx + spanText.length), type: span.type });
    searchFrom = idx + spanText.length;
  }

  if (searchFrom < text.length) {
    segments.push({ text: text.slice(searchFrom), type: null });
  }

  return segments;
}

export function DivergenceHighlighter({ text, divergenceSpans, side }: DivergenceHighlighterProps) {
  const segments = useMemo(() => buildSegments(text, divergenceSpans, side), [text, divergenceSpans, side]);

  return (
    <p className="whitespace-pre-wrap">
      {segments.map((segment, i) =>
        segment.type !== null ? (
          <mark key={`${segment.text.slice(0, 10)}-${i}`} className={`rounded px-0.5 ${HIGHLIGHT_CLASSES[segment.type]}`}>
            {segment.text}
          </mark>
        ) : (
          <span key={`plain-${i}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
