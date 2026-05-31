// Tests for IdentitySummary — top-level stats card
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IdentitySummary } from './IdentitySummary';

const baseProps = {
  weeklyMinutes: 45,
  weeklySessionCount: 6,
  currentFocus: 'Vocabulary Precision',
  currentStreak: 3,
};

describe('IdentitySummary', () => {
  it('renders weekly minutes', () => {
    render(<IdentitySummary {...baseProps} />);
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('renders weekly session count', () => {
    render(<IdentitySummary {...baseProps} />);
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
  });

  it('renders current focus metric', () => {
    render(<IdentitySummary {...baseProps} />);
    expect(screen.getByText('Vocabulary Precision')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
  });

  it('renders "Not set" when focus is null', () => {
    render(<IdentitySummary {...baseProps} currentFocus={null} />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('renders drill count when drills completed', () => {
    render(<IdentitySummary {...baseProps} totalDrillsCompleted={12} />);
    expect(screen.getByText(/12 drills completed/)).toBeInTheDocument();
  });

  it('does not render drill count when zero', () => {
    render(<IdentitySummary {...baseProps} totalDrillsCompleted={0} />);
    expect(screen.queryByText(/drills completed/)).not.toBeInTheDocument();
  });

  it('uses singular "drill" for count of 1', () => {
    render(<IdentitySummary {...baseProps} totalDrillsCompleted={1} />);
    expect(screen.getByText(/1 drill completed/)).toBeInTheDocument();
  });

  it('renders workout weeks when provided and > 0', () => {
    render(<IdentitySummary {...baseProps} workoutWeeks={8} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Workout Weeks')).toBeInTheDocument();
  });

  it('does not render workout weeks when zero', () => {
    render(<IdentitySummary {...baseProps} workoutWeeks={0} />);
    expect(screen.queryByText('Workout Weeks')).not.toBeInTheDocument();
  });
});
