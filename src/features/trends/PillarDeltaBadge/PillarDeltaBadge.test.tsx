/** @vitest-environment jsdom */
// Tests for PillarDeltaBadge — delta display, color variants, and range labels

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PillarDeltaBadge } from './PillarDeltaBadge';
import type { TimeRange } from '../trends.types';

describe('PillarDeltaBadge', () => {
  it('renders nothing when delta is null', () => {
    const { container } = render(<PillarDeltaBadge delta={null} range="7d" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a green badge with up arrow for positive delta', () => {
    render(<PillarDeltaBadge delta={3.5} range="30d" />);
    const badge = screen.getByText(/↑ 3\.5% this month/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });

  it('renders an amber badge with down arrow for negative delta', () => {
    render(<PillarDeltaBadge delta={-2.0} range="30d" />);
    const badge = screen.getByText(/↓ 2\.0% this month/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-amber-100');
    expect(badge.className).toContain('text-amber-700');
  });

  it('renders a gray "Stable" badge when delta is zero', () => {
    render(<PillarDeltaBadge delta={0} range="7d" />);
    const badge = screen.getByText(/Stable this week/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-600');
  });

  it('uses "this week" label for 7d range', () => {
    render(<PillarDeltaBadge delta={1} range="7d" />);
    expect(screen.getByText(/this week/)).toBeInTheDocument();
  });

  it('uses "this quarter" label for 90d range', () => {
    render(<PillarDeltaBadge delta={1} range="90d" />);
    expect(screen.getByText(/this quarter/)).toBeInTheDocument();
  });

  it('formats delta to exactly one decimal place', () => {
    render(<PillarDeltaBadge delta={4.567} range="all" />);
    // toFixed(1) rounds 4.567 → "4.6"
    expect(screen.getByText(/4\.6% overall/)).toBeInTheDocument();
  });

  it('uses "overall" label for "all" range', () => {
    const range: TimeRange = 'all';
    render(<PillarDeltaBadge delta={-1.2} range={range} />);
    expect(screen.getByText(/overall/)).toBeInTheDocument();
  });
});
