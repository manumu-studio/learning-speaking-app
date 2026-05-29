// Tests for SkipNavigation component — accessibility and rendering
import { axe } from '@/__mocks__/rtl-setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkipNavigation } from './SkipNavigation';

describe('SkipNavigation', () => {
  it('renders a link with href pointing to main-content by default', () => {
    render(<SkipNavigation />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#main-content');
  });

  it('renders with a custom targetId', () => {
    render(<SkipNavigation targetId="custom-target" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#custom-target');
  });

  it('contains the default skip label text', () => {
    render(<SkipNavigation />);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument();
  });

  it('renders with a custom label', () => {
    render(<SkipNavigation label="Jump to content" />);
    expect(screen.getByRole('link', { name: 'Jump to content' })).toBeInTheDocument();
  });

  it('has the sr-only class for visual hiding', () => {
    render(<SkipNavigation />);
    expect(screen.getByRole('link').className).toContain('sr-only');
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(<SkipNavigation />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
