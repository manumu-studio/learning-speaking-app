// Tests for side-by-side transcript comparison layout
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TranscriptComparison } from './TranscriptComparison';
import type { DivergenceSpan } from '@/lib/analysis/divergence/divergence.types';

const spans: DivergenceSpan[] = [
  { start: 0, end: 1, verbatimText: 'uh', normalizedText: '', type: 'insertion', confidence: 0.9 },
];

describe('TranscriptComparison', () => {
  it('renders both Whisper and verbatim columns', () => {
    render(
      <TranscriptComparison
        whisperText="I think so"
        verbatimText="uh I think so"
        divergenceSpans={spans}
        whisperWordCount={3}
        verbatimWordCount={4}
        verbatimProvider={null}
      />,
    );

    expect(screen.getByText('Whisper (cleaned)')).toBeInTheDocument();
    expect(screen.getByText('AssemblyAI (verbatim)')).toBeInTheDocument();
  });

  it('shows word count badges', () => {
    render(
      <TranscriptComparison
        whisperText="I think so"
        verbatimText="uh I think so"
        divergenceSpans={spans}
        whisperWordCount={3}
        verbatimWordCount={4}
        verbatimProvider={null}
      />,
    );

    expect(screen.getByText('3 words')).toBeInTheDocument();
    expect(screen.getByText('4 words')).toBeInTheDocument();
  });

  it('shows stats row with word difference', () => {
    render(
      <TranscriptComparison
        whisperText="I think so"
        verbatimText="uh I think so"
        divergenceSpans={spans}
        whisperWordCount={3}
        verbatimWordCount={4}
        verbatimProvider={null}
      />,
    );

    expect(screen.getByText(/1 more/)).toBeInTheDocument();
    expect(screen.getByText(/1 difference detected/)).toBeInTheDocument();
  });

  it('shows match message when no divergences', () => {
    render(
      <TranscriptComparison
        whisperText="I think so"
        verbatimText="I think so"
        divergenceSpans={[]}
        whisperWordCount={3}
        verbatimWordCount={3}
        verbatimProvider={null}
      />,
    );

    expect(screen.getByText(/No differences detected/)).toBeInTheDocument();
  });

  it('uses custom provider label when given', () => {
    render(
      <TranscriptComparison
        whisperText="Hello"
        verbatimText="Hello"
        divergenceSpans={[]}
        whisperWordCount={1}
        verbatimWordCount={1}
        verbatimProvider="deepgram"
      />,
    );

    expect(screen.getByText('deepgram (verbatim)')).toBeInTheDocument();
  });
});
