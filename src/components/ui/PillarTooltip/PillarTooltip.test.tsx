// Tests for PillarTooltip — pillar score breakdown with contextual sentence
import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PillarTooltip } from './PillarTooltip';
import type { SessionMetricSnapshot } from '@/features/session/useSessionStatus.types';

function makeMetric(key: string, score: number): SessionMetricSnapshot {
  return { id: `m-${key}`, key, level: 'medium', score, note: null, createdAt: '2026-01-01' };
}

const LANGUAGE_METRICS: SessionMetricSnapshot[] = [
  makeMetric('connectorRepetition', 4.2),
  makeMetric('structuralVariety', 6.8),
  makeMetric('vocabularyPrecision', 5.0),
  makeMetric('verbAccuracy', 5.2),
];

const DELIVERY_METRICS: SessionMetricSnapshot[] = [
  makeMetric('speakingRate', 7.0),
  makeMetric('fillerUsage', 3.5),
  makeMetric('argumentClosure', 6.2),
];

const PRONUNCIATION_METRICS: SessionMetricSnapshot[] = [
  makeMetric('pronunciationAccuracy', 8.1),
  makeMetric('prosodyScore', 7.9),
];

describe('PillarTooltip', () => {
  // --- Rendering ---

  it('renders constituent metrics with labels and scores', () => {
    render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Connector Repetition')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('Structural Variety')).toBeInTheDocument();
    expect(screen.getByText('6.8')).toBeInTheDocument();
  });

  it('renders delivery pillar with its 3 metrics', () => {
    render(
      <PillarTooltip pillarKey="delivery" metrics={DELIVERY_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Filler Usage')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('Speaking Rate')).toBeInTheDocument();
    expect(screen.getByText('Argument Closure')).toBeInTheDocument();
  });

  it('renders pronunciation pillar with its 2 metrics', () => {
    render(
      <PillarTooltip pillarKey="pronunciation" metrics={PRONUNCIATION_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Pronunciation Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Prosody & Rhythm')).toBeInTheDocument();
  });

  it('sorts metrics by score ascending (worst first)', () => {
    render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen onClose={vi.fn()} />,
    );
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const labels = items.map((li) => li.textContent);
    expect(labels?.[0]).toContain('Connector Repetition');
    expect(labels?.[0]).toContain('4.2');
    expect(labels?.[items.length - 1]).toContain('Structural Variety');
    expect(labels?.[items.length - 1]).toContain('6.8');
  });

  it('only shows metrics belonging to the requested pillar', () => {
    const mixed = [...LANGUAGE_METRICS, ...DELIVERY_METRICS];
    render(
      <PillarTooltip pillarKey="language" metrics={mixed} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Connector Repetition')).toBeInTheDocument();
    expect(screen.queryByText('Filler Usage')).not.toBeInTheDocument();
    expect(screen.queryByText('Speaking Rate')).not.toBeInTheDocument();
  });

  // --- Contextual sentence logic ---

  it('shows contextual sentence identifying weakest metric', () => {
    render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Connector Repetition brought this score down.')).toBeInTheDocument();
  });

  it('shows consistent message when scores are close', () => {
    const close = [
      makeMetric('connectorRepetition', 5.5),
      makeMetric('structuralVariety', 5.8),
      makeMetric('vocabularyPrecision', 5.6),
      makeMetric('verbAccuracy', 5.7),
    ];
    render(
      <PillarTooltip pillarKey="language" metrics={close} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Consistent across all areas.')).toBeInTheDocument();
  });

  it('shows strong performance when average >= 8.0 and scores are close', () => {
    const strong = [
      makeMetric('connectorRepetition', 8.5),
      makeMetric('structuralVariety', 8.2),
      makeMetric('vocabularyPrecision', 8.0),
      makeMetric('verbAccuracy', 8.3),
    ];
    render(
      <PillarTooltip pillarKey="language" metrics={strong} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Strong performance across all areas.')).toBeInTheDocument();
  });

  it('prioritizes "brought down" over "strong" when avg >= 8 but one metric drags', () => {
    const highAvgWithDrag = [
      makeMetric('connectorRepetition', 10.0),
      makeMetric('structuralVariety', 9.5),
      makeMetric('vocabularyPrecision', 9.0),
      makeMetric('verbAccuracy', 5.0),
    ];
    render(
      <PillarTooltip pillarKey="language" metrics={highAvgWithDrag} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByText('Verb Accuracy brought this score down.')).toBeInTheDocument();
    expect(screen.queryByText('Strong performance across all areas.')).not.toBeInTheDocument();
  });

  // --- Empty / edge cases ---

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no matching metrics exist', () => {
    const { container } = render(
      <PillarTooltip pillarKey="pronunciation" metrics={LANGUAGE_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for empty metrics array', () => {
    const { container } = render(
      <PillarTooltip pillarKey="language" metrics={[]} isOpen onClose={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  // --- Accessibility ---

  it('has role="tooltip" for accessibility', () => {
    render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('has an aria-labeled metric breakdown list', () => {
    render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen onClose={vi.fn()} />,
    );
    expect(screen.getByLabelText('Metric breakdown')).toBeInTheDocument();
  });

  // --- Interaction ---

  it('calls onClose when mobile backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <PillarTooltip pillarKey="language" metrics={LANGUAGE_METRICS} isOpen onClose={onClose} />,
    );
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
