// Component tests for DrillRecommendation — copy and start action
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DrillRecommendation } from './DrillRecommendation';

describe('DrillRecommendation', () => {
  it('renders metric label and drill type context', () => {
    render(
      <DrillRecommendation
        drillType="precision"
        metricLabel="Verb Accuracy"
        timeLimit={45}
        onStartDrill={vi.fn()}
      />,
    );
    expect(screen.getByText('Train This Pattern', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Verb Accuracy')).toBeInTheDocument();
    expect(screen.getByText(/Precision/)).toBeInTheDocument();
  });

  it('formats short time limits in seconds', () => {
    render(
      <DrillRecommendation
        drillType="rephrase"
        metricLabel="X"
        timeLimit={30}
        onStartDrill={vi.fn()}
      />,
    );
    expect(screen.getByText(/30s/)).toBeInTheDocument();
  });

  it('calls onStartDrill when button is pressed', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <DrillRecommendation
        drillType="conclusion"
        metricLabel="Closure"
        timeLimit={120}
        onStartDrill={onStart}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Start Drill' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
