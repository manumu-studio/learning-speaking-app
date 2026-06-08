// Generic table component for displaying evidence data
'use client';

import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import type { EvidenceTableProps } from './EvidenceTable.types';

export function EvidenceTable({
  title,
  columns,
  rows,
}: EvidenceTableProps) {
  if (rows.length === 0) return null;

  return (
    <CollapsibleSection title={title} count={rows.length} defaultOpen>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`row-${idx}`}
                className="border-b border-gray-100 last:border-0 dark:border-gray-800"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-2 py-1.5 font-mono text-gray-700 dark:text-gray-300"
                  >
                    {row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}
