// Component tests for DrillStats — labels and formatted values
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrillStats } from './DrillStats';

describe('DrillStats', () => {
  it('renders all three stat labels', () => {
    render(
      <DrillStats totalCompleted={5} weeklyCompleted={2} improvementRate={33.7} />,
    );
    expect(screen.getByText('Total Drills')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Improvement')).toBeInTheDocument();
  });

  it('displays numeric totals', () => {
    render(
      <DrillStats totalCompleted={12} weeklyCompleted={3} improvementRate={0} />,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('rounds improvement rate for display', () => {
    render(
      <DrillStats totalCompleted={0} weeklyCompleted={0} improvementRate={66.4} />,
    );
    expect(screen.getByText('66%')).toBeInTheDocument();
  });
});
