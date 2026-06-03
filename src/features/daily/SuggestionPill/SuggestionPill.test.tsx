// Test the suggestion pill category coloring and active-target ring
/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuggestionPill } from './SuggestionPill';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SuggestionPill', () => {
  it('renders the suggestion text', () => {
    render(<SuggestionPill text="bear in mind" category="collocation" isActiveTarget={false} />);

    expect(screen.getByText('bear in mind')).toBeInTheDocument();
  });

  it('applies the category-specific color class', () => {
    render(<SuggestionPill text="look into" category="phrasal_verb" isActiveTarget={false} />);

    const pill = screen.getByText('look into');
    expect(pill.className).toContain('bg-teal-100');
  });

  it('falls back to the default color for an unknown category', () => {
    render(<SuggestionPill text="albeit" category="mystery" isActiveTarget={false} />);

    const pill = screen.getByText('albeit');
    expect(pill.className).toContain('bg-gray-100');
  });

  it('adds a ring when the item is an active target', () => {
    render(<SuggestionPill text="depend on" category="verb" isActiveTarget />);

    const pill = screen.getByText('depend on');
    expect(pill.className).toContain('ring-1');
  });

  it('omits the ring when not an active target', () => {
    render(<SuggestionPill text="depend on" category="verb" isActiveTarget={false} />);

    const pill = screen.getByText('depend on');
    expect(pill.className).not.toContain('ring-1');
  });
});
