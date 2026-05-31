// Tests for More sheet — open, close, navigation items
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoreSheet } from './MoreSheet';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}));

describe('MoreSheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<MoreSheet isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders secondary nav items when open', () => {
    render(<MoreSheet isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Prompts')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<MoreSheet isOpen={true} onClose={onClose} />);
    onClose.mockClear();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    render(<MoreSheet isOpen={true} onClose={onClose} />);
    onClose.mockClear();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has aria-modal for accessibility', () => {
    render(<MoreSheet isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
