// Tests for mobile bottom tab bar rendering and interaction
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottomTabBar } from './BottomTabBar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}));

describe('BottomTabBar', () => {
  it('renders 4 navigation items (3 tabs + More button)', () => {
    render(<BottomTabBar onMorePress={vi.fn()} />);

    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('calls onMorePress when More button is tapped', async () => {
    const onMorePress = vi.fn();
    render(<BottomTabBar onMorePress={onMorePress} />);

    await userEvent.click(screen.getByLabelText('More navigation options'));
    expect(onMorePress).toHaveBeenCalledOnce();
  });

  it('highlights the active tab based on pathname', () => {
    render(<BottomTabBar onMorePress={vi.fn()} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('text-sky-600');
  });

  it('has correct nav links', () => {
    render(<BottomTabBar onMorePress={vi.fn()} />);

    expect(screen.getByText('Record').closest('a')).toHaveAttribute('href', '/session/new');
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('History').closest('a')).toHaveAttribute('href', '/history');
  });
});
