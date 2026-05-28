/** @vitest-environment jsdom */
// Tests for PromptBanner — prompt display, category badge, label, and className forwarding

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PromptBanner } from './PromptBanner';
import type { PromptBannerProps } from './PromptBanner.types';

describe('PromptBanner', () => {
  const baseProps: PromptBannerProps = {
    promptText: 'Describe a challenge you overcame at work.',
    category: 'Professional',
  };

  it('renders the prompt text', () => {
    render(<PromptBanner {...baseProps} />);
    expect(
      screen.getByText('Describe a challenge you overcame at work.')
    ).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<PromptBanner {...baseProps} />);
    expect(screen.getByText('Professional')).toBeInTheDocument();
  });

  it('shows the "Your prompt" label', () => {
    render(<PromptBanner {...baseProps} />);
    expect(screen.getByText('Your prompt')).toBeInTheDocument();
  });

  it('applies a custom className to the container', () => {
    const { container } = render(
      <PromptBanner {...baseProps} className="mt-4 custom-class" />
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain('mt-4');
    expect(root?.className).toContain('custom-class');
  });

  it('renders without errors when className is omitted (defaults to empty string)', () => {
    const { container } = render(<PromptBanner {...baseProps} />);
    const root = container.firstElementChild;
    // No extra class injected — the trailing space from template literal is trimmed by the browser
    expect(root).toBeInTheDocument();
    expect(root?.className).not.toContain('undefined');
  });
});
