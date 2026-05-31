'use client';
// Reusable collapsible section with chevron toggle, optional count badge, and slide animation
import { useId } from 'react';
import { useCollapsibleSection } from './useCollapsibleSection';
import type { CollapsibleSectionProps } from './CollapsibleSection.types';

export function CollapsibleSection({
  title,
  defaultOpen = false,
  count,
  children,
  animationDelay,
  sectionId,
}: CollapsibleSectionProps) {
  const autoId = useId();
  const bodyId = sectionId ?? `collapsible-${autoId.replace(/:/g, '')}`;
  const { isOpen, toggle } = useCollapsibleSection(defaultOpen);

  const outerStyle =
    animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      style={outerStyle}
      aria-labelledby={`${bodyId}-heading`}
    >
      <button
        type="button"
        id={`${bodyId}-heading`}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </span>
          {count !== undefined && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {count}
            </span>
          )}
        </div>
        <span
          className={[
            'shrink-0 text-slate-500 transition-transform duration-300 dark:text-slate-400',
            isOpen ? 'rotate-180' : 'rotate-0',
          ].join(' ')}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        id={bodyId}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? '10000px' : '0' }}
        hidden={!isOpen}
      >
        <div className="border-t border-slate-100 p-4 pt-3 dark:border-slate-700">{children}</div>
      </div>
    </section>
  );
}
