// Tests for CollapsibleSection toggle behavior and accessibility
import { axe } from '@/__mocks__/rtl-setup';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders title and children when defaultOpen is true', () => {
    render(
      <CollapsibleSection title="Grammar" defaultOpen count={2}>
        <p>Insight content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole('button', { name: /Grammar/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Insight content')).toBeVisible();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('starts collapsed when defaultOpen is false', () => {
    render(
      <CollapsibleSection title="Word Color Map" defaultOpen={false}>
        <p>Map content</p>
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole('button', { name: /Word Color Map/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles aria-expanded on click', () => {
    render(
      <CollapsibleSection title="Prosody Feedback" defaultOpen={false}>
        <p>Prosody content</p>
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole('button', { name: /Prosody Feedback/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <CollapsibleSection title="Structure" defaultOpen count={0}>
        <p>No issues detected</p>
      </CollapsibleSection>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
