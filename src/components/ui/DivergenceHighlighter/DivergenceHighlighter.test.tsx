// Tests for divergence span highlighting across verbatim and normalized sides
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DivergenceHighlighter } from './DivergenceHighlighter';
import type { DivergenceSpan } from '@/lib/analysis/divergence/divergence.types';

const spans: DivergenceSpan[] = [
  { start: 0, end: 1, verbatimText: 'um', normalizedText: '', type: 'insertion', confidence: 0.9 },
  { start: 2, end: 3, verbatimText: 'gonna', normalizedText: 'going to', type: 'substitution', confidence: 0.85 },
  { start: 5, end: 6, verbatimText: '', normalizedText: 'really', type: 'deletion', confidence: 0.8 },
];

describe('DivergenceHighlighter', () => {
  it('highlights insertions and substitutions on the verbatim side', () => {
    render(
      <DivergenceHighlighter
        text="um I'm gonna do it"
        divergenceSpans={spans}
        side="verbatim"
      />,
    );

    const marks = screen.getAllByRole('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveTextContent('um');
    expect(marks[1]).toHaveTextContent('gonna');
  });

  it('highlights deletions and substitutions on the normalized side', () => {
    render(
      <DivergenceHighlighter
        text="I'm going to really do it"
        divergenceSpans={spans}
        side="normalized"
      />,
    );

    const marks = screen.getAllByRole('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveTextContent('going to');
    expect(marks[1]).toHaveTextContent('really');
  });

  it('renders plain text when no spans match', () => {
    render(
      <DivergenceHighlighter
        text="No divergences here"
        divergenceSpans={[]}
        side="verbatim"
      />,
    );

    expect(screen.queryAllByRole('mark')).toHaveLength(0);
    expect(screen.getByText('No divergences here')).toBeInTheDocument();
  });

  it('applies correct highlight class per type', () => {
    render(
      <DivergenceHighlighter
        text="um I'm gonna do it"
        divergenceSpans={spans}
        side="verbatim"
      />,
    );

    const marks = screen.getAllByRole('mark');
    expect(marks[0]?.className).toContain('bg-blue');
    expect(marks[1]?.className).toContain('bg-amber');
  });
});
