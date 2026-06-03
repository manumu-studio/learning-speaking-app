// Test the mastery state badge rendering and label logic
/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MasteryBadge } from './MasteryBadge';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MasteryBadge', () => {
  it('renders the state label with usage count over the goal of 15', () => {
    render(<MasteryBadge state="developing" usageCount={4} />);

    expect(screen.getByText('developing (4/15)')).toBeInTheDocument();
  });

  it('appends a checkmark to the label when mastered', () => {
    render(<MasteryBadge state="mastered" usageCount={15} />);

    expect(screen.getByText('mastered ✓ (15/15)')).toBeInTheDocument();
  });

  it('applies the state-specific color class', () => {
    render(<MasteryBadge state="consolidating" usageCount={9} />);

    const badge = screen.getByText('consolidating (9/15)');
    expect(badge.className).toContain('text-amber-600');
  });

  it('falls back to the emerging color for an unknown state', () => {
    // Cast through unknown to exercise the runtime fallback branch
    const props = { state: 'unknown', usageCount: 0 } as unknown as Parameters<
      typeof MasteryBadge
    >[0];
    render(<MasteryBadge {...props} />);

    const badge = screen.getByText('unknown (0/15)');
    expect(badge.className).toContain('text-gray-500');
  });
});
