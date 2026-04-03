// Component tests for MicroWin — improved vs practice messaging
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MicroWin } from './MicroWin';

describe('MicroWin', () => {
  it('shows positive copy when improved', () => {
    render(<MicroWin improved metricLabel="Fluency" />);
    expect(screen.getByText(/improved in this drill/)).toBeInTheDocument();
    expect(screen.getByText('Fluency')).toBeInTheDocument();
  });

  it('shows practice copy when not improved', () => {
    render(<MicroWin improved={false} metricLabel="Pacing" />);
    expect(screen.getByText(/Try one more rep/)).toBeInTheDocument();
    expect(screen.getByText('Pacing')).toBeInTheDocument();
  });
});
