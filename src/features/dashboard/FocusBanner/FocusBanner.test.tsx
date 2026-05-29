// Tests for FocusBanner component — aria-live and focus label display
import { axe } from '@/__mocks__/rtl-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FocusBanner } from './FocusBanner';

describe('FocusBanner', () => {
  it('renders role="status" element', () => {
    render(<FocusBanner focusLabel="Connector Repetition" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders aria-live="polite" attribute', () => {
    render(<FocusBanner focusLabel="Connector Repetition" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('displays the provided focusLabel text', () => {
    render(<FocusBanner focusLabel="Connector Repetition" />);
    expect(screen.getByText('Connector Repetition')).toBeInTheDocument();
  });

  it('aria-label includes the focus label value', () => {
    render(<FocusBanner focusLabel="Connector Repetition" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      "Today's focus: Connector Repetition",
    );
  });

  it('passes axe assertion', async () => {
    const { container } = render(<FocusBanner focusLabel="Connector Repetition" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
