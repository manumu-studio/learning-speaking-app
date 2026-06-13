// Types and Zod schemas for the eval report table component.
// Matches the shape written by scripts/eval/report.ts.
import { z } from 'zod';

const CIBoundsSchema = z.object({
  lower: z.number(),
  upper: z.number(),
});

export const EvalMetricRowSchema = z.object({
  metric: z.string(),
  n: z.number().int(),
  mae: z.number().nullable(),
  maeCI: CIBoundsSchema.nullable(),
  withinOne: z.number().nullable(), // fraction 0..1 — display as %
  withinOneCI: CIBoundsSchema.nullable(),
  spearman: z.number().nullable(),
  spearmanCI: CIBoundsSchema.nullable(),
  bandedQwk: z.number().nullable(),
  intraCeiling: z.number().nullable(),
});

export const EvalReportSchema = z.object({
  generatedAt: z.string(),
  metrics: z.array(EvalMetricRowSchema),
});

export type EvalMetricRow = z.infer<typeof EvalMetricRowSchema>;
export type EvalReport = z.infer<typeof EvalReportSchema>;

export interface EvalReportTableProps {
  readonly report: EvalReport;
}

export interface MetricRowProps {
  readonly row: EvalMetricRow;
}
