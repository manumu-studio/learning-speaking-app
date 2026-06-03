// Test the active target card progress clamping and category formatting
/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveTargetCard } from './ActiveTargetCard';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActiveTargetCard', () => {
  it('renders the suggestion text and humanizes the category label', () => {
    render(
      <ActiveTargetCard
        text="look into"
        category="phrasal_verb"
        usageCount={5}
        masteryState="developing"
      />,
    );

    expect(screen.getByText('look into')).toBeInTheDocument();
    // underscores are replaced with spaces for display
    expect(screen.getByText('phrasal verb')).toBeInTheDocument();
  });

  it('sets progress bar width proportional to usage below the goal', () => {
    const { container } = render(
      <ActiveTargetCard
        text="bear in mind"
        category="collocation"
        usageCount={3}
        masteryState="emerging"
      />,
    );

    // 3 / 15 = 20%
    const bar = container.querySelector('[style*="width"]');
    expect(bar).not.toBeNull();
    expect((bar as HTMLElement).style.width).toBe('20%');
  });

  it('clamps progress bar width at 100% when usage exceeds the goal', () => {
    const { container } = render(
      <ActiveTargetCard
        text="albeit"
        category="connector"
        usageCount={30}
        masteryState="mastered"
      />,
    );

    const bar = container.querySelector('[style*="width"]');
    expect((bar as HTMLElement).style.width).toBe('100%');
  });

  it('renders the embedded mastery badge', () => {
    render(
      <ActiveTargetCard
        text="depend on"
        category="verb"
        usageCount={7}
        masteryState="consolidating"
      />,
    );

    expect(screen.getByText('consolidating (7/15)')).toBeInTheDocument();
  });
});
