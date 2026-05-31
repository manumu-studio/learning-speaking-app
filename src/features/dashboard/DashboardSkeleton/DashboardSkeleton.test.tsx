// Tests for DashboardSkeleton — loading placeholder
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardSkeleton } from './DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('renders skeleton grid with pulse animations', () => {
    const { container } = render(<DashboardSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('renders 4 stat column placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    const statCols = container.querySelectorAll('.grid-cols-2 > div');
    expect(statCols).toHaveLength(4);
  });

  it('renders 6 metric card placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    const metricCards = container.querySelectorAll('.grid-cols-1 > div');
    expect(metricCards).toHaveLength(6);
  });

  it('applies custom className', () => {
    const { container } = render(<DashboardSkeleton className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});
