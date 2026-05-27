// Component tests for TimeLimitSelector — options and localStorage persistence
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimeLimitSelector } from './TimeLimitSelector';

describe('TimeLimitSelector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all time limit options', () => {
    render(<TimeLimitSelector selected={null} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlimited' })).toBeInTheDocument();
  });

  it('calls onChange and persists selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TimeLimitSelector selected={null} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '1 min' }));

    expect(onChange).toHaveBeenCalledWith(60);
    expect(localStorage.getItem('lsa-time-limit')).toBe('60');
  });

  it('marks the selected option as pressed', () => {
    render(<TimeLimitSelector selected={30} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '30s' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
