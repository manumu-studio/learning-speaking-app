// Evidence table sections — renders all evidence categories for a bundle
'use client';

import { EvidenceTable } from '@/features/logs/EvidenceTable';
import type { EvidenceBundle } from '@/lib/evidence';

export function EvidenceSections({ bundle }: { bundle: EvidenceBundle }) {
  return (
    <div className="space-y-2">
      <EvidenceTable
        title="Metrics"
        columns={[
          { key: 'metric', label: 'Metric' },
          { key: 'score', label: 'Score' },
          { key: 'source', label: 'Source' },
          { key: 'timestamp', label: 'Timestamp' },
        ]}
        rows={bundle.metrics.map((m) => ({
          metric: m.metricKey,
          score: m.displayValue,
          source: m.ref.table,
          timestamp: m.timestamp.slice(0, 19),
        }))}
      />
      <EvidenceTable
        title="Transcript Spans"
        columns={[
          { key: 'range', label: 'Word Range' },
          { key: 'verbatim', label: 'Verbatim' },
          { key: 'normalized', label: 'Normalized' },
          { key: 'confidence', label: 'Confidence' },
        ]}
        rows={bundle.transcript.map((t) => ({
          range: `${t.startWordIndex}–${t.endWordIndex}`,
          verbatim: t.verbatimText,
          normalized: t.normalizedText,
          confidence: t.confidence?.toFixed(2) ?? null,
        }))}
      />
      <EvidenceTable
        title="Grammar"
        columns={[
          { key: 'text', label: 'Span' },
          { key: 'type', label: 'Classification' },
          { key: 'errorType', label: 'Error Type' },
          { key: 'corpus', label: 'Corpus Evidence' },
        ]}
        rows={bundle.grammar.map((g) => ({
          text: g.displayValue,
          type: g.classification.replace('_', ' '),
          errorType: g.errorType,
          corpus: g.corpusEvidence,
        }))}
      />
      <PronunciationAndNaturalnessTables bundle={bundle} />
      {bundle.pipelineMetadata && (
        <EvidenceTable
          title="Pipeline Metadata"
          columns={[
            { key: 'key', label: 'Field' },
            { key: 'value', label: 'Value' },
          ]}
          rows={[
            { key: 'ASR Provider', value: bundle.pipelineMetadata.asrProvider },
            { key: 'Verbatim Provider', value: bundle.pipelineMetadata.verbatimProvider },
            { key: 'Chunks', value: bundle.pipelineMetadata.chunkCount },
            { key: 'Processed', value: bundle.pipelineMetadata.processingTimestamp.slice(0, 19) },
          ]}
        />
      )}
    </div>
  );
}

function PronunciationAndNaturalnessTables({ bundle }: { bundle: EvidenceBundle }) {
  return (
    <>
      <EvidenceTable
        title="Pronunciation"
        columns={[
          { key: 'word', label: 'Word' },
          { key: 'accuracy', label: 'Accuracy' },
          { key: 'errorType', label: 'Error Type' },
          { key: 'source', label: 'Source' },
        ]}
        rows={bundle.pronunciation.map((p) => ({
          word: p.word,
          accuracy: p.displayValue,
          errorType: p.errorType,
          source: p.ref.table,
        }))}
      />
      <EvidenceTable
        title="Naturalness"
        columns={[
          { key: 'flag', label: 'Flag' },
          { key: 'type', label: 'Type' },
          { key: 'metric', label: 'Metric' },
          { key: 'suggestion', label: 'Suggestion' },
        ]}
        rows={bundle.naturalness.map((n) => ({
          flag: n.displayValue,
          type: n.flagType,
          metric: n.collocationMetric?.toFixed(2) ?? null,
          suggestion: n.suggestion,
        }))}
      />
      <EvidenceTable
        title="Corpus"
        columns={[
          { key: 'word', label: 'Word' },
          { key: 'freq', label: 'Frequency' },
          { key: 'mi', label: 'MI' },
          { key: 'attested', label: 'Attested' },
        ]}
        rows={bundle.corpus.map((c) => ({
          word: c.word,
          freq: c.frequency,
          mi: c.mi?.toFixed(2) ?? null,
          attested: c.attestedInCorpus ? 'Yes' : 'No',
        }))}
      />
    </>
  );
}
