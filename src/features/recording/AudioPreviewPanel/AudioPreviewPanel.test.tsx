// Component tests for AudioPreviewPanel — preview playback and actions
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AudioPreviewPanel } from './AudioPreviewPanel';

describe('AudioPreviewPanel', () => {
  const baseProps = {
    audioPreviewUrl: 'blob:mock-preview',
    vadWarning: null,
    isUploading: false,
    onSubmit: vi.fn(),
    onTryAgain: vi.fn(),
    onDiscard: vi.fn(),
  };

  it('renders audio preview and action buttons', () => {
    render(<AudioPreviewPanel {...baseProps} />);

    expect(screen.getByLabelText(/session recording preview/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /submit recording for analysis/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go recording again/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /discard recording and return/i }),
    ).toBeInTheDocument();
  });

  it('fires callbacks for submit, retry, and discard', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onTryAgain = vi.fn();
    const onDiscard = vi.fn();

    render(
      <AudioPreviewPanel
        {...baseProps}
        onSubmit={onSubmit}
        onTryAgain={onTryAgain}
        onDiscard={onDiscard}
      />,
    );

    await user.click(screen.getByRole('button', { name: /submit recording/i }));
    await user.click(screen.getByRole('button', { name: /go recording again/i }));
    await user.click(screen.getByRole('button', { name: /discard recording/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onTryAgain).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('displays vadWarning message when provided', () => {
    render(
      <AudioPreviewPanel
        {...baseProps}
        vadWarning={{
          message: 'Multiple voices detected in the background.',
          canProceed: true,
        }}
      />,
    );

    expect(
      screen.getByText('Multiple voices detected in the background.'),
    ).toBeInTheDocument();
  });

  it('hides action buttons and shows uploading copy when isUploading', () => {
    render(<AudioPreviewPanel {...baseProps} isUploading />);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit recording for analysis/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /go recording again/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /discard recording and return/i }),
    ).not.toBeInTheDocument();
  });
});
