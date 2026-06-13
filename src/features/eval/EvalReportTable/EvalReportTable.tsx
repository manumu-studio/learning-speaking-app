// Eval report table — renders per-metric MAE, within-1 %, Spearman, banded QWK,
// 95% CI, intra-rater ceiling, and N. Flags rows where MAE exceeds the intra-rater ceiling.
'use client';

import type { EvalReportTableProps, EvalMetricRow, MetricRowProps } from './EvalReportTable.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Row is RED when both values are present and mae exceeds the intra-rater ceiling. */
function isFlagged(row: EvalMetricRow): boolean {
  return row.mae !== null && row.intraCeiling !== null && row.mae > row.intraCeiling;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return '—';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function fmtCI(lower: number, upper: number): string {
  return `[${lower.toFixed(2)}, ${upper.toFixed(2)}]`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const HEADERS = [
  'Metric',
  'MAE',
  'Within-1 %',
  'Spearman',
  'Banded QWK',
  '95% CI (MAE)',
  'Intra-rater ceiling',
  'N',
] as const;

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-700">
        {HEADERS.map((h) => (
          <th key={h} className="px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function MetricRow({ row }: MetricRowProps) {
  const flagged = isFlagged(row);
  const rowClass = [
    'border-b border-gray-100 last:border-0 dark:border-gray-800',
    flagged ? 'bg-red-50 dark:bg-red-950/30' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const maeClass = [
    'px-2 py-1.5 font-mono',
    flagged ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
  ].join(' ');

  const ci = row.maeCI !== null ? fmtCI(row.maeCI.lower, row.maeCI.upper) : '—';

  return (
    <tr className={rowClass}>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">
        {flagged && (
          <span
            className="mr-1 text-red-600 dark:text-red-400"
            title="MAE exceeds intra-rater ceiling — treat this metric with extra caution"
            aria-label="flagged"
          >
            ▲
          </span>
        )}
        {row.metric}
      </td>
      <td className={maeClass}>{fmt(row.mae)}</td>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">
        {fmtPct(row.withinOne)}
      </td>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">
        {fmt(row.spearman)}
      </td>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">
        {fmt(row.bandedQwk)}
      </td>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">{ci}</td>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">
        {fmt(row.intraCeiling)}
      </td>
      <td className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300">{row.n}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EvalReportTable({ report }: EvalReportTableProps) {
  const { generatedAt, metrics } = report;
  const totalN = metrics.reduce((sum, m) => sum + m.n, 0);

  return (
    <div className="mt-6">
      {/* Honesty caveat */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
        <strong>Limitations:</strong> N={totalN} labelled pairs, single rater, not externally
        validated or inter-rater tested. MAE and correlations are indicative only. Rows flagged{' '}
        <span className="font-semibold text-red-600 dark:text-red-400">red ▲</span> have MAE above
        the intra-rater ceiling — those metrics are unreliable; treat scores with extra caution.
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Generated: {new Date(generatedAt).toLocaleString()}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <TableHead />
          <tbody>
            {metrics.map((row) => (
              <MetricRow key={row.metric} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
