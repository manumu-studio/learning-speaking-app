// Tests for PersonalRecordStrip — horizontal row of personal bests
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PersonalRecord } from '@/lib/personalRecords.types';
import { PersonalRecordStrip } from './PersonalRecordStrip';

function makePR(overrides: Partial<PersonalRecord> = {}): PersonalRecord {
  return {
    metricKey: 'vocabularyPrecision',
    metricLabel: 'Vocabulary Precision',
    score: 8.5,
    timeframe: 'all-time',
    previousBest: 7.2,
    sessionDate: '2026-05-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('PersonalRecordStrip', () => {
  it('renders nothing when no personal records', () => {
    const { container } = render(<PersonalRecordStrip personalRecords={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders heading when records exist', () => {
    render(<PersonalRecordStrip personalRecords={[makePR()]} />);
    expect(screen.getByText('Personal Bests')).toBeInTheDocument();
  });

  it('renders metric label and score for each record', () => {
    const records = [
      makePR({ metricKey: 'vocabularyPrecision', metricLabel: 'Vocabulary', score: 8.5 }),
      makePR({ metricKey: 'fillerUsage', metricLabel: 'Filler Usage', score: 9.0 }),
    ];
    render(<PersonalRecordStrip personalRecords={records} />);
    expect(screen.getByText('Vocabulary')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('Filler Usage')).toBeInTheDocument();
    expect(screen.getByText('9.0')).toBeInTheDocument();
  });

  it('formats the session date as short month and day', () => {
    render(
      <PersonalRecordStrip
        personalRecords={[makePR({ sessionDate: '2026-05-15T12:00:00.000Z' })]}
      />,
    );
    expect(screen.getByText(/May/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });
});
