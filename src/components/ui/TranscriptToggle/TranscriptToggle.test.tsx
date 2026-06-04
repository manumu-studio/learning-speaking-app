// Tests for transcript modes, including pronunciation-map mode
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TranscriptToggle } from './TranscriptToggle';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

const word: WordPronunciation = {
  word: 'Hello',
  display: 'Hello',
  accuracyScore: 72,
  errorType: 'Mispronunciation',
  offsetMs: 0,
  durationMs: 300,
  phonemes: [{ phoneme: 'hh', accuracyScore: 72 }],
  l1Tags: [],
  breakErrorTypes: [],
  intonationErrorTypes: [],
  monotonePitchDelta: null,
};

describe('TranscriptToggle', () => {
  it('starts with pronunciation map when word-level pronunciation exists', () => {
    render(
      <TranscriptToggle
        originalText="Hello, world."
        improvedText={null}
        wordsUsed={[]}
        wordCount={2}
        pronunciationWords={[word]}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Pronunciation map' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Hello' })).toBeInTheDocument();
  });

  it('opens phoneme detail when a pronunciation word is clicked', () => {
    render(
      <TranscriptToggle
        originalText="Hello."
        improvedText={null}
        wordsUsed={[]}
        wordCount={1}
        pronunciationWords={[word]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hello' }));

    expect(screen.getByRole('region', { name: /Phoneme detail for "Hello"/i })).toBeInTheDocument();
  });
});
