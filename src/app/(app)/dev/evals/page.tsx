// Dev-only eval report page — reads eval/REPORT-latest.json and renders EvalReportTable.
// Gated by NODE_ENV check (mirrors src/app/api/docs/page.tsx pattern).
// Auth gate is handled by the parent (app) layout which redirects unauthenticated users.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EvalReportTable } from '@/features/eval/EvalReportTable';
import { EvalReportSchema } from '@/features/eval/EvalReportTable/EvalReportTable.types';

const REPORT_PATH = join(process.cwd(), 'eval', 'REPORT-latest.json');

function readReport(): unknown {
  if (!existsSync(REPORT_PATH)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));
    return parsed;
  } catch {
    return null;
  }
}

export default function EvalsPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-slate-500">Eval report is only available in development.</p>
      </div>
    );
  }

  const raw = readReport();

  if (raw === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Eval Report</h1>
        <p className="mt-4 text-sm text-slate-500">
          No report found at <code className="font-mono">eval/REPORT-latest.json</code>. Run{' '}
          <code className="font-mono">npm run eval:report</code> to generate one.
        </p>
      </div>
    );
  }

  const parsed = EvalReportSchema.safeParse(raw);

  if (!parsed.success) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Eval Report</h1>
        <p className="mt-4 text-sm text-red-500">
          Report JSON failed validation: {parsed.error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Eval Report</h1>
      <EvalReportTable report={parsed.data} />
    </div>
  );
}
