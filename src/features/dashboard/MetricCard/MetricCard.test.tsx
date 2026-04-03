// Component tests for MetricCard — rendering, sparkline, accessibility, and selection
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MetricCard } from './MetricCard';

const baseProps = {
  metricKey: 'connectorRepetition' as const,
  label: 'Connector Repetition',
  currentLevel: 'medium' as const,
  currentScore: 7.5,
  trend: 'stable' as const,
  history: [5, 6, 7, 7.5],
  isSelected: false,
  onSelect: vi.fn(),
};

describe('MetricCard', () => {
  it('renders metric label and score', () => {
    render(<MetricCard {...baseProps} />);
    expect(screen.getByText('Connector Repetition')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('renders sparkline SVG when history data is provided', () => {
    const { container } = render(<MetricCard {...baseProps} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('exposes an accessible name for the metric', () => {
    render(<MetricCard {...baseProps} />);
    expect(
      screen.getByRole('button', { name: /select connector repetition as training focus/i }),
    ).toBeInTheDocument();
  });

  it('calls onSelect with metric key when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MetricCard {...baseProps} onSelect={onSelect} />);
    await user.click(
      screen.getByRole('button', { name: /select connector repetition as training focus/i }),
    );
    expect(onSelect).toHaveBeenCalledWith('connectorRepetition');
  });

  it('shows Last trained today badge when lastTrainedToday is true', () => {
    render(<MetricCard {...baseProps} lastTrainedToday />);
    expect(screen.getByText(/last trained: today/i)).toBeInTheDocument();
  });
});
