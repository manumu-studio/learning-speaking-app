// Tests for PillarTrendCard — pillar chart, delta badge, and metric drill-down toggle
/** @vitest-environment jsdom */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PillarTrendCard } from './PillarTrendCard';

vi.mock('@/components/ui/TrendChart', () => ({
  TrendChart: ({ ariaLabel }: { ariaLabel: string }) => (
    <div data-testid="trend-chart" aria-label={ariaLabel} />
  ),
}));

vi.mock('../PillarDeltaBadge', () => ({
  PillarDeltaBadge: ({ delta, range }: { delta: number | null; range: string }) => (
    <span data-testid="delta-badge">{delta !== null ? `${String(delta)}% ${range}` : 'none'}</span>
  ),
}));

const samplePillar = {
  pillarKey: 'delivery',
  label: 'Delivery',
  color: '#3b82f6',
  series: [
    { date: '2026-05-01', value: 6.5 },
    { date: '2026-05-02', value: 7.0 },
    { date: '2026-05-03', value: 7.2 },
  ],
  deltaPercent: 10.8,
  metricSeries: [
    {
      metricKey: 'fillerUsage',
      label: 'Filler Words',
      series: [{ date: '2026-05-01', value: 7.0 }],
    },
    {
      metricKey: 'speakingRate',
      label: 'Speaking Rate',
      series: [],
    },
  ],
};

describe('PillarTrendCard', () => {
  it('renders pillar label', () => {
    render(<PillarTrendCard pillar={samplePillar} range="30d" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Delivery' })).toBeDefined();
  });

  it('renders delta badge with correct props', () => {
    render(<PillarTrendCard pillar={samplePillar} range="30d" />);
    const badge = screen.getByTestId('delta-badge');
    expect(badge.textContent).toBe('10.8% 30d');
  });

  it('renders trend chart with correct aria-label', () => {
    render(<PillarTrendCard pillar={samplePillar} range="7d" />);
    const chart = screen.getByTestId('trend-chart');
    expect(chart.getAttribute('aria-label')).toBe('Delivery trend over time');
  });

  it('shows average computed from series data', () => {
    // avg of [6.5, 7.0, 7.2] = 20.7 / 3 = 6.9
    render(<PillarTrendCard pillar={samplePillar} range="30d" />);
    expect(screen.getByText('Avg 6.9')).toBeDefined();
  });

  it('renders "Show metrics" button when metricSeries is non-empty', () => {
    render(<PillarTrendCard pillar={samplePillar} range="30d" />);
    expect(screen.getByRole('button', { name: 'Show metrics' })).toBeDefined();
  });

  it('clicking "Show metrics" expands to show metric labels', () => {
    render(<PillarTrendCard pillar={samplePillar} range="30d" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show metrics' }));

    expect(screen.getByText('Filler Words')).toBeDefined();
    expect(screen.getByText('Speaking Rate')).toBeDefined();
  });

  it('clicking "Hide metrics" collapses the section', () => {
    render(<PillarTrendCard pillar={samplePillar} range="30d" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show metrics' }));
    expect(screen.getByRole('button', { name: 'Hide metrics' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Hide metrics' }));
    expect(screen.queryByText('Filler Words')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show metrics' })).toBeDefined();
  });

  it('does not show toggle when metricSeries is empty', () => {
    const pillarNoMetrics = { ...samplePillar, metricSeries: [] };
    render(<PillarTrendCard pillar={pillarNoMetrics} range="30d" />);
    expect(screen.queryByRole('button', { name: 'Show metrics' })).toBeNull();
  });
});
