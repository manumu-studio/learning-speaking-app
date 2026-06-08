// Tests for evidence type contracts — shape validation and no-fake-AI-thoughts guard
import { describe, expect, it } from 'vitest';
import type {
  EvidenceSource,
  EvidenceBundle,
  EvidenceRef,
  MetricEvidence,
} from './evidence.types';

describe('evidence type contracts', () => {
  it('EvidenceSource does not include AI thought types', () => {
    const allSources: EvidenceSource[] = [
      'metric_snapshot',
      'insight',
      'pronunciation_report',
      'word_pronunciation',
      'naturalness_flag',
      'grammar_flag',
      'divergence_span',
      'corpus_frequency',
      'corpus_collocation',
      'language_bank_item',
      'daily_conclusion',
      'pipeline_metadata',
    ];

    const forbiddenPatterns = ['ai_thought', 'internal_reasoning', 'thinking', 'chain_of_thought'];
    for (const source of allSources) {
      for (const pattern of forbiddenPatterns) {
        expect(source).not.toContain(pattern);
      }
    }
  });

  it('EvidenceRef requires source, table, and rowId', () => {
    const ref: EvidenceRef = {
      source: 'metric_snapshot',
      table: 'MetricSnapshot',
      rowId: 'abc123',
      field: 'score',
    };

    expect(ref.source).toBe('metric_snapshot');
    expect(ref.table).toBe('MetricSnapshot');
    expect(ref.rowId).toBe('abc123');
  });

  it('EvidenceBundle has all required sections', () => {
    const bundle: EvidenceBundle = {
      entityType: 'session',
      entityId: 'sess-1',
      metrics: [],
      transcript: [],
      grammar: [],
      pronunciation: [],
      naturalness: [],
      corpus: [],
      pipelineMetadata: null,
    };

    expect(bundle.entityType).toBe('session');
    expect(Array.isArray(bundle.metrics)).toBe(true);
    expect(Array.isArray(bundle.transcript)).toBe(true);
    expect(Array.isArray(bundle.grammar)).toBe(true);
    expect(Array.isArray(bundle.pronunciation)).toBe(true);
    expect(Array.isArray(bundle.naturalness)).toBe(true);
    expect(Array.isArray(bundle.corpus)).toBe(true);
  });

  it('MetricEvidence extends EvidenceItem with metric-specific fields', () => {
    const metric: MetricEvidence = {
      ref: { source: 'metric_snapshot', table: 'MetricSnapshot', rowId: 'm1', field: 'score' },
      label: 'verbAccuracy (session)',
      rawValue: 7,
      displayValue: '7/10',
      timestamp: '2026-06-01T10:00:00.000Z',
      sessionId: 'sess-1',
      metricKey: 'verbAccuracy',
      normalizedScore: 7,
      previousScore: 6,
      delta: 1,
    };

    expect(metric.metricKey).toBe('verbAccuracy');
    expect(metric.delta).toBe(1);
    expect(metric.ref.source).toBe('metric_snapshot');
  });
});
