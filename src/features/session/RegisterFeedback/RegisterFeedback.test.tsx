// Tests for RegisterFeedback component — rendering branches, badges, note, and suggestions
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RegisterFeedback } from './RegisterFeedback';
import type { RegisterFeedbackProps } from './RegisterFeedback.types';

// Minimal complete props to use as a base
const baseProps: RegisterFeedbackProps = {
  register: 'neutral',
  appropriateness: 'appropriate',
  hedgingLevel: 'adequate',
  directnessLevel: 'appropriately-direct',
  suggestions: [],
  note: '',
};

describe('RegisterFeedback — classification badges', () => {
  it('renders a Register badge with the mapped register value', () => {
    render(<RegisterFeedback {...baseProps} register="formal" />);
    expect(screen.getByText('Register: Formal')).toBeInTheDocument();
  });

  it('renders neutral register badge', () => {
    render(<RegisterFeedback {...baseProps} register="neutral" />);
    expect(screen.getByText('Register: Neutral')).toBeInTheDocument();
  });

  it('renders informal register badge', () => {
    render(<RegisterFeedback {...baseProps} register="informal" />);
    expect(screen.getByText('Register: Informal')).toBeInTheDocument();
  });

  it('renders appropriate Match badge', () => {
    render(<RegisterFeedback {...baseProps} appropriateness="appropriate" />);
    expect(screen.getByText('Match: Appropriate')).toBeInTheDocument();
  });

  it('renders slightly-off Match badge with spaces replacing hyphens', () => {
    render(<RegisterFeedback {...baseProps} appropriateness="slightly-off" />);
    expect(screen.getByText('Match: Slightly off')).toBeInTheDocument();
  });

  it('renders mismatch Match badge', () => {
    render(<RegisterFeedback {...baseProps} appropriateness="mismatch" />);
    expect(screen.getByText('Match: Mismatch')).toBeInTheDocument();
  });

  it('renders Hedging: Adequate for the adequate hedging level', () => {
    render(<RegisterFeedback {...baseProps} hedgingLevel="adequate" />);
    expect(screen.getByText('Hedging: Adequate')).toBeInTheDocument();
  });

  it('renders Hedging: Under-hedged for the under-hedged level', () => {
    render(<RegisterFeedback {...baseProps} hedgingLevel="under-hedged" />);
    expect(screen.getByText('Hedging: Under-hedged')).toBeInTheDocument();
  });

  it('renders Hedging: Over-hedged for the over-hedged level', () => {
    render(<RegisterFeedback {...baseProps} hedgingLevel="over-hedged" />);
    expect(screen.getByText('Hedging: Over-hedged')).toBeInTheDocument();
  });

  it('renders directness label Appropriately Direct from LABEL_MAP', () => {
    render(<RegisterFeedback {...baseProps} directnessLevel="appropriately-direct" />);
    expect(screen.getByText('Appropriately Direct')).toBeInTheDocument();
  });

  it('renders directness label Too Direct from LABEL_MAP', () => {
    render(<RegisterFeedback {...baseProps} directnessLevel="too-direct" />);
    expect(screen.getByText('Too Direct')).toBeInTheDocument();
  });

  it('renders directness label Too Indirect from LABEL_MAP', () => {
    render(<RegisterFeedback {...baseProps} directnessLevel="too-indirect" />);
    expect(screen.getByText('Too Indirect')).toBeInTheDocument();
  });
});

describe('RegisterFeedback — coaching note', () => {
  it('renders the note text when note is a non-empty string', () => {
    render(<RegisterFeedback {...baseProps} note="Try to vary your register." />);
    expect(screen.getByText('Try to vary your register.')).toBeInTheDocument();
  });

  it('does not render a note block when note is an empty string', () => {
    const { container } = render(<RegisterFeedback {...baseProps} note="" />);
    // The note paragraph should not appear
    expect(container.querySelector('p.text-sm.leading-relaxed')).toBeNull();
  });
});

describe('RegisterFeedback — suggestions', () => {
  it('does not render a Suggestions heading when suggestions is empty', () => {
    render(<RegisterFeedback {...baseProps} suggestions={[]} />);
    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
  });

  it('renders Suggestions heading when at least one suggestion is present', () => {
    render(
      <RegisterFeedback
        {...baseProps}
        suggestions={[
          { original: 'I want', issue: 'Too direct', alternative: 'I would like' },
        ]}
      />,
    );
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });

  it('renders original and alternative text for a single suggestion', () => {
    render(
      <RegisterFeedback
        {...baseProps}
        suggestions={[
          { original: 'I want', issue: 'Too direct', alternative: 'I would like' },
        ]}
      />,
    );
    expect(screen.getByText((_, el) => el?.textContent === '“I want”')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === 'Try: “I would like”')).toBeInTheDocument();
  });

  it('renders the issue text for a suggestion', () => {
    render(
      <RegisterFeedback
        {...baseProps}
        suggestions={[
          { original: 'I want', issue: 'Too direct for a formal context', alternative: 'I would like' },
        ]}
      />,
    );
    expect(screen.getByText('Too direct for a formal context')).toBeInTheDocument();
  });

  it('renders multiple suggestions', () => {
    render(
      <RegisterFeedback
        {...baseProps}
        suggestions={[
          { original: 'wanna', issue: 'Informal', alternative: 'would like to' },
          { original: 'gonna', issue: 'Informal', alternative: 'going to' },
        ]}
      />,
    );
    expect(screen.getByText((_, el) => el?.textContent === '“wanna”')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === '“gonna”')).toBeInTheDocument();
  });
});

describe('RegisterFeedback — Badge fallback color', () => {
  it('renders without crashing for an unknown register value (fallback color path)', () => {
    // Cast to bypass TS strict type for testing the runtime fallback branch
    const props = { ...baseProps, register: 'unknown-register' as RegisterFeedbackProps['register'] };
    render(<RegisterFeedback {...props} />);
    expect(screen.getByText(/Register:/)).toBeInTheDocument();
  });

  it('renders without crashing for an unknown appropriateness value (fallback color path)', () => {
    const props = { ...baseProps, appropriateness: 'unknown-match' as RegisterFeedbackProps['appropriateness'] };
    render(<RegisterFeedback {...props} />);
    expect(screen.getByText(/Match:/)).toBeInTheDocument();
  });
});

describe('RegisterFeedback — full render smoke test', () => {
  it('renders all sections together without crashing', () => {
    render(
      <RegisterFeedback
        register="formal"
        appropriateness="slightly-off"
        hedgingLevel="under-hedged"
        directnessLevel="too-indirect"
        note="Consider adjusting your hedging strategy."
        suggestions={[
          { original: 'wanna', issue: 'Informal vocabulary', alternative: 'would like to' },
        ]}
      />,
    );
    expect(screen.getByText('Register: Formal')).toBeInTheDocument();
    expect(screen.getByText('Match: Slightly off')).toBeInTheDocument();
    expect(screen.getByText('Hedging: Under-hedged')).toBeInTheDocument();
    expect(screen.getByText('Too Indirect')).toBeInTheDocument();
    expect(screen.getByText('Consider adjusting your hedging strategy.')).toBeInTheDocument();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });
});
