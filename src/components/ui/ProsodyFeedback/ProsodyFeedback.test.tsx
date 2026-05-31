// Tests for ProsodyFeedback — coach-style prosody tips with severity ranking
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
    expect(heading?.textContent).toBe('Rhythm & Intonation');
  });

  it('shows actionable tip for break error words', () => {
    const words = [makeWord({ word: 'however', breakErrorTypes: ['MissingBreak'] })];
    const { container } = render(<ProsodyFeedback words={words} prosodyScore={6} animationDelay={0} />);
    expect(container.textContent).toContain('however');
    expect(screen.getByText(/add a brief pause/i)).toBeInTheDocument();
  });

  it('shows actionable tip for intonation error words', () => {
    const words = [makeWord({ word: 'really', intonationErrorTypes: ['MonotonePitch'] })];
    const { container } = render(<ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />);
    expect(container.textContent).toContain('really');
    expect(screen.getByText(/vary your pitch/i)).toBeInTheDocument();
  });

  it('shows coaching for monotone words via pitch delta', () => {
    const words = [makeWord({ word: 'important', monotonePitchDelta: 0.1 })];
    const { container } = render(<ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />);
    expect(container.textContent).toContain('important');
    expect(screen.getByText(/sounds flat/i)).toBeInTheDocument();
  });

  it('filters out "None" from breakErrorTypes (Azure noise)', () => {
    const words = [makeWord({ word: 'clean', breakErrorTypes: ['None'] })];
    render(<ProsodyFeedback words={words} prosodyScore={9} animationDelay={0} />);
    expect(screen.getByText(/rhythm and intonation sound natural/i)).toBeInTheDocument();
  });

  it('filters out "None" from intonationErrorTypes (Azure noise)', () => {
    const words = [makeWord({ word: 'fine', intonationErrorTypes: ['None'] })];
    render(<ProsodyFeedback words={words} prosodyScore={9} animationDelay={0} />);
    expect(screen.getByText(/rhythm and intonation sound natural/i)).toBeInTheDocument();
  });

  it('limits displayed issues to top 5 by severity', () => {
    const words = Array.from({ length: 10 }, (_, i) =>
      makeWord({ word: `word${i}`, breakErrorTypes: ['UnexpectedBreak'] }),
    );
    render(<ProsodyFeedback words={words} prosodyScore={4} animationDelay={0} />);
    const tips = screen.getAllByText(/remove the pause/i);
    expect(tips.length).toBe(5);
    expect(screen.getByText(/\+ 5 more minor issues/i)).toBeInTheDocument();
  });

  it('shows coaching summary for break-heavy sessions', () => {
    const words = [
      makeWord({ word: 'one', breakErrorTypes: ['UnexpectedBreak'] }),
      makeWord({ word: 'two', breakErrorTypes: ['MissingBreak'] }),
    ];
    render(<ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />);
    expect(screen.getByText(/focus on your pauses/i)).toBeInTheDocument();
  });

  it('shows coaching summary for intonation-heavy sessions', () => {
    const words = [
      makeWord({ word: 'one', intonationErrorTypes: ['MonotonePitch'] }),
      makeWord({ word: 'two', intonationErrorTypes: ['FlatPitch'] }),
    ];
    render(<ProsodyFeedback words={words} prosodyScore={5} animationDelay={0} />);
    expect(screen.getByText(/focus on pitch variety/i)).toBeInTheDocument();
  });

  it('shows "sounds natural" message when no issues detected', () => {
    const words = [makeWord({ word: 'perfect' })];
    render(<ProsodyFeedback words={words} prosodyScore={10} animationDelay={0} />);
    expect(
      screen.getByText(/rhythm and intonation sound natural/i),
    ).toBeInTheDocument();
  });

  it('does not show "sounds natural" when issues exist', () => {
    const words = [makeWord({ word: 'bad', intonationErrorTypes: ['FlatPitch'] })];
    render(<ProsodyFeedback words={words} prosodyScore={4} animationDelay={0} />);
    expect(
      screen.queryByText(/rhythm and intonation sound natural/i),
    ).not.toBeInTheDocument();
  });

  it('renders issue type badges (Pause, Pitch, Rhythm)', () => {
    const words = [
      makeWord({ word: 'a', breakErrorTypes: ['UnexpectedBreak'] }),
      makeWord({ word: 'b', intonationErrorTypes: ['MonotonePitch'] }),
      makeWord({ word: 'c', monotonePitchDelta: 0.1 }),
    ];
    render(<ProsodyFeedback words={words} prosodyScore={4} animationDelay={0} />);
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Pitch')).toBeInTheDocument();
    expect(screen.getByText('Rhythm')).toBeInTheDocument();
  });
});
