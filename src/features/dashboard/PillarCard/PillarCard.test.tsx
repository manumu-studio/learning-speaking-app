// Component tests for PillarCard — rendering, expand/collapse, delta badge, accessibility

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PillarCard } from './PillarCard';

const baseProps = {
  pillarKey: 'delivery' as const,
  label: 'Delivery',
  averageScore: 7.2,
  delta: 0.5,
  sparklineData: [6, 6.5, 7, 7.2],
  color: 'blue',
  isExpanded: false,
  onToggle: vi.fn(),
};

describe('PillarCard', () => {
  it('renders pillar label and score chip', () => {
    render(<PillarCard {...baseProps} />);
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByLabelText('Building')).toBeInTheDocument();
  });

  it('aria-expanded is false when collapsed', () => {
    render(<PillarCard {...baseProps} isExpanded={false} />);
    expect(screen.getByRole('button', { name: /delivery/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('aria-expanded is true when expanded', () => {
    render(<PillarCard {...baseProps} isExpanded />);
    expect(screen.getByRole('button', { name: /delivery/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('calls onToggle when header button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<PillarCard {...baseProps} onToggle={onToggle} />);
    await user.click(screen.getByRole('button', { name: /delivery/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('hides children when collapsed', () => {
    const { container } = render(
      <PillarCard {...baseProps} isExpanded={false}>
        <span>Child metric</span>
      </PillarCard>,
    );
    const childrenWrapper = container.querySelector('.hidden');
    expect(childrenWrapper).toBeTruthy();
    expect(childrenWrapper?.textContent).toContain('Child metric');
  });

  it('shows children when expanded', () => {
    render(
      <PillarCard {...baseProps} isExpanded>
        <span>Child metric</span>
      </PillarCard>,
    );
    expect(screen.getByText('Child metric')).toBeVisible();
  });

  it('positive delta uses green text class', () => {
    const { container } = render(<PillarCard {...baseProps} delta={0.5} />);
    const badge = container.querySelector('.text-green-600');
    expect(badge).toBeTruthy();
  });

  it('negative delta uses amber text class', () => {
    const { container } = render(<PillarCard {...baseProps} delta={-0.3} />);
    const badge = container.querySelector('.text-amber-600');
    expect(badge).toBeTruthy();
  });

  it('zero delta uses slate text class', () => {
    const { container } = render(<PillarCard {...baseProps} delta={0} />);
    const badge = container.querySelector('.text-slate-500');
    expect(badge).toBeTruthy();
  });

  it('shows No history yet when sparklineData is empty', () => {
    render(<PillarCard {...baseProps} sparklineData={[]} />);
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });
});
