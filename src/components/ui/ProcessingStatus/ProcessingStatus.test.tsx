// Tests for ProcessingStatus component — aria-live regions and retry behaviour
import { axe } from '@/__mocks__/rtl-setup';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProcessingStatus } from './ProcessingStatus';

describe('ProcessingStatus', () => {
  it('FAILED state renders role="alert" container', () => {
    const { container } = render(
      <ProcessingStatus status="FAILED" errorMessage="Upload failed" />,
    );
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
  });

  it('FAILED state renders aria-live="assertive" attribute', () => {
    const { container } = render(
      <ProcessingStatus status="FAILED" errorMessage="Upload failed" />,
    );
    expect(container.querySelector('[aria-live="assertive"]')).toBeInTheDocument();
  });

  it('non-FAILED state renders role="status" container', () => {
    const { container } = render(<ProcessingStatus status="TRANSCRIBING" />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('non-FAILED state renders aria-live="polite"', () => {
    const { container } = render(<ProcessingStatus status="TRANSCRIBING" />);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('retry button fires onRetry callback when clicked', () => {
    const onRetry = vi.fn();
    render(
      <ProcessingStatus status="FAILED" errorMessage="Upload failed" onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('passes axe for FAILED state', async () => {
    const { container } = render(
      <ProcessingStatus status="FAILED" errorMessage="Upload failed" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe for TRANSCRIBING state', async () => {
    const { container } = render(<ProcessingStatus status="TRANSCRIBING" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
