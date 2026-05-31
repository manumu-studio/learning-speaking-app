// Tests for ProsodyFeedback — prosody score display, word indicators, and monotone coaching
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';
import { ProsodyFeedback } from './ProsodyFeedback';

vi.mock('@/components/ui/PronunciationSection', () => ({
  mapAzureScoreToDisplay: (score: number) => Math.round(score * 10) / 10,
}));

function makeWord(overrides: Partial<WordPronunciation> = {}): WordPronunciation {
  return {
    word: 'hello',
    accuracyScore: 90,
    errorType: 'None',
    offsetMs: 0,
    durationMs: 500,
    phonemes: [],
    l1Tags: [],
    breakErrorTypes: [],
    intonationErrorTypes: [],
    monotonePitchDelta: null,
    ...overrides,
  };
}

describe('ProsodyFeedback', () => {
  it('renders the prosody score', () => {
    render(
      <ProsodyFeedback words={[makeWord()]} prosodyScore={7.5} animationDelay={0} />,
    );
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('/10 prosody')).toBeInTheDocument();
  });

  it('renders heading with correct id for aria-labelledby', () => {
    const { container } = render(
      <ProsodyFeedback words={[makeWord()]} prosodyScore={8} animationDelay={0} />,
    );
    const heading = container.querySelector('#prosody-feedback-heading');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe('Prosody Feedback');
  });

  it('renders word indicators for each word', () => {
    const words = [
      makeWord({ word: 'the' }),
      makeWord({ word: 'cat' }),
      makeWord({ word: 'sat' }),
    ];
    render(<ProsodyFeedback words={words} prosodyScore={8} animationDelay={0} />);
    expect(screen.getByText('the')).toBeInTheDocument();
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('sat')).toBeInTheDocument();
  });

  it('shows intonation indicator on words with intonation errors', () => {
    const words = [makeWord({ word: 'test', intonationErrorTypes: ['MonotonePitch'] })];
    const { container } = render(
      <ProsodyFeedback words={words} prosodyScore={6} animationDelay={0} />,
    );
    const indicators = container.querySelectorAll('[aria-label*="intonation issue"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('renders visible legend for prosody indicators', () => {
    render(<ProsodyFeedback words={[makeWord()]} prosodyScore={8} animationDelay={0} />);
    expect(screen.getByLabelText('Prosody indicator legend')).toBeInTheDocument();
    expect(screen.getByText('Pause / break issue')).toBeInTheDocument();
    expect(screen.getByText('Intonation issue')).toBeInTheDocument();
    expect(screen.getByText('Monotone pitch')).toBeInTheDocument();
  });

  it('shows break indicator on words with break errors', () => {
    const words = [makeWord({ word: 'pause', breakErrorTypes: ['UnexpectedBreak'] })];
    const { container } = render(
      <ProsodyFeedback words={words} prosodyScore={6} animationDelay={0} />,
    );
    expect(container.querySelector('.border-dashed')).toBeInTheDocument();
  });

  it('shows monotone indicator when pitch delta is below threshold', () => {
    const words = [makeWord({ word: 'flat', monotonePitchDelta: 0.1 })];
    const { container } = render(
      <ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />,
    );
    const indicators = container.querySelectorAll('[aria-label*="monotone pitch"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('shows monotone coaching tip when monotone pattern detected', () => {
    const words = [makeWord({ word: 'flat', monotonePitchDelta: 0.1 })];
    render(<ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />);
    expect(
      screen.getByText(/try varying pitch on stressed syllables/i),
    ).toBeInTheDocument();
  });

  it('does not show monotone coaching when no monotone words', () => {
    const words = [makeWord({ word: 'good', monotonePitchDelta: 0.8 })];
    render(<ProsodyFeedback words={words} prosodyScore={9} animationDelay={0} />);
    expect(
      screen.queryByText(/try varying pitch on stressed syllables/i),
    ).not.toBeInTheDocument();
  });

  it('shows "no issues" message when all words are clean', () => {
    const words = [makeWord({ word: 'perfect' })];
    render(<ProsodyFeedback words={words} prosodyScore={10} animationDelay={0} />);
    expect(
      screen.getByText(/no significant prosody issues detected/i),
    ).toBeInTheDocument();
  });

  it('hides "no issues" message when words have issues', () => {
    const words = [makeWord({ word: 'bad', intonationErrorTypes: ['FlatPitch'] })];
    render(<ProsodyFeedback words={words} prosodyScore={4} animationDelay={0} />);
    expect(
      screen.queryByText(/no significant prosody issues detected/i),
    ).not.toBeInTheDocument();
  });

  it('prefers intonation indicator over monotone when both present', () => {
    const words = [
      makeWord({
        word: 'both',
        intonationErrorTypes: ['MonotonePitch'],
        monotonePitchDelta: 0.1,
      }),
    ];
    const { container } = render(
      <ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />,
    );
    const wordSpan = container.querySelector('[aria-label="both, intonation issue, monotone pitch"]');
    expect(wordSpan?.querySelector('.text-amber-600')).toBeInTheDocument();
    expect(wordSpan?.querySelector('.text-blue-500')).not.toBeInTheDocument();
  });
});
