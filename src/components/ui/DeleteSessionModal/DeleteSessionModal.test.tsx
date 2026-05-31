// Unit tests for DeleteSessionModal — open/close behavior, accessibility, and delete flow
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DeleteSessionModal } from './DeleteSessionModal';
import { useDeleteSessionModal } from './useDeleteSessionModal';

vi.mock('./useDeleteSessionModal', () => ({
  useDeleteSessionModal: vi.fn().mockReturnValue({
    isDeleting: false,
    error: null,
    deleteSession: vi.fn().mockResolvedValue(true),
  }),
}));

const mockedUseDeleteSessionModal = vi.mocked(useDeleteSessionModal);

const defaultProps = {
  isOpen: true,
  sessionId: 'session-123',
  onClose: vi.fn(),
  onConfirm: vi.fn(),
};

describe('DeleteSessionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseDeleteSessionModal.mockReturnValue({
      isDeleting: false,
      error: null,
      deleteSession: vi.fn().mockResolvedValue(true),
    });
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <DeleteSessionModal {...defaultProps} isOpen={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders title "Delete this workout?" when open', () => {
    render(<DeleteSessionModal {...defaultProps} />);

    expect(
      screen.getByRole('heading', { name: /delete this workout\?/i }),
    ).toBeInTheDocument();
  });

  it('renders explanation about permanent deletion', () => {
    render(<DeleteSessionModal {...defaultProps} />);

    expect(
      screen.getByText(/permanently delete all recordings, transcripts/i),
    ).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<DeleteSessionModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<DeleteSessionModal {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has role="alertdialog"', () => {
    render(<DeleteSessionModal {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('shows "Deleting…" when isDeleting is true', () => {
    render(<DeleteSessionModal {...defaultProps} isDeleting={true} />);

    expect(
      screen.getByRole('button', { name: /deleting/i }),
    ).toBeInTheDocument();
  });

  it('calls deleteSession and onConfirm on successful delete', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const deleteSession = vi.fn().mockResolvedValue(true);

    mockedUseDeleteSessionModal.mockReturnValue({
      isDeleting: false,
      error: null,
      deleteSession,
    });

    render(
      <DeleteSessionModal {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(deleteSession).toHaveBeenCalledWith('session-123');
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not call onConfirm when deleteSession fails', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const deleteSession = vi.fn().mockResolvedValue(false);

    mockedUseDeleteSessionModal.mockReturnValue({
      isDeleting: false,
      error: null,
      deleteSession,
    });

    render(
      <DeleteSessionModal {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(deleteSession).toHaveBeenCalledWith('session-123');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not call onClose on Escape when isDeleting', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DeleteSessionModal {...defaultProps} onClose={onClose} isDeleting={true} />,
    );

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
