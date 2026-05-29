// Tests for TranscriptSection component — rendering and keyboard accessibility
import { axe } from '@/__mocks__/rtl-setup';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TranscriptSection } from './TranscriptSection';

const defaultProps = {
  text: 'Test transcript.',
  wordCount: 2,
};

describe('TranscriptSection', () => {
  it('renders without crashing', () => {
    render(<TranscriptSection {...defaultProps} />);
    expect(screen.getByText('Transcript')).toBeInTheDocument();
  });

  it('toggle button has aria-expanded=false initially', () => {
    render(<TranscriptSection {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Show transcript' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('toggle button has aria-expanded=true after click', () => {
    render(<TranscriptSection {...defaultProps} />);
    const toggle = screen.getByRole('button', { name: 'Show transcript' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide transcript' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('toggle button has aria-controls pointing to transcript-body', () => {
    render(<TranscriptSection {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Show transcript' })).toHaveAttribute(
      'aria-controls',
      'transcript-body',
    );
  });

  it('collapsible body has id="transcript-body"', () => {
    render(<TranscriptSection {...defaultProps} />);
    expect(document.getElementById('transcript-body')).toBeInTheDocument();
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(<TranscriptSection {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
