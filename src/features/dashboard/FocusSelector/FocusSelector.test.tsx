// Component tests for FocusSelector — banner visibility, clear action, and theme classes
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FocusSelector } from './FocusSelector';

describe('FocusSelector', () => {
  it('renders nothing when focus label is null', () => {
    const { container } = render(<FocusSelector focusLabel={null} onClear={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders focus banner with metric label when set', () => {
    render(<FocusSelector focusLabel="Structural Variety" onClear={vi.fn()} />);
    expect(screen.getByText(/today's training focus/i)).toBeInTheDocument();
    expect(screen.getByText('Structural Variety')).toBeInTheDocument();
  });

  it('calls onClear when Clear is pressed', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<FocusSelector focusLabel="Vocabulary Precision" onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: /clear training focus/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('includes dark mode utility classes in markup', () => {
    const { container } = render(<FocusSelector focusLabel="Test Focus" onClear={vi.fn()} />);
    expect(container.innerHTML).toMatch(/dark:/);
  });
});
