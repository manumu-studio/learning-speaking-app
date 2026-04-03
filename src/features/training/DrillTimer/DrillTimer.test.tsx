// Component tests for DrillTimer — accessibility and MM:SS display
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DrillTimer } from './DrillTimer';

describe('DrillTimer', () => {
  it('renders with role timer', () => {
    render(
      <DrillTimer mode="countdown" duration={120} isRunning={false} onComplete={vi.fn()} />,
    );
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('uses aria-live polite', () => {
    render(
      <DrillTimer mode="countdown" duration={60} isRunning={false} onComplete={vi.fn()} />,
    );
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'polite');
  });

  it('countdown mode uses Time remaining label', () => {
    render(
      <DrillTimer mode="countdown" duration={90} isRunning={false} onComplete={vi.fn()} />,
    );
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Time remaining');
  });

  it('countup mode uses Time elapsed label', () => {
    render(<DrillTimer mode="countup" duration={90} isRunning={false} onComplete={vi.fn()} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Time elapsed');
  });

  it('displays time as MM:SS', () => {
    render(
      <DrillTimer mode="countdown" duration={125} isRunning={false} onComplete={vi.fn()} />,
    );
    expect(screen.getByRole('timer').textContent).toMatch(/^\d{2}:\d{2}$/);
  });
});
