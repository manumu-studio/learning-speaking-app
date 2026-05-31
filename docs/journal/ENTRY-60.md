# Entry 60 — 2026-05-31

**Type:** Feature + UX Polish
**Branch:** `feat/pillar-score-tooltips`
**Version:** 0.52.1

## Summary

Added contextual tooltips to pillar score cards on the session results page, replaced loading text with a pulsing microphone animation, and fixed several dark mode / light mode color issues.

## What was built

### Pillar Score Tooltips
- `PillarTooltip` component with 4-file pattern — shows constituent metric breakdown per pillar (Delivery, Language, Pronunciation) with scores sorted worst-first
- Contextual sentence computed client-side: identifies which metric dragged the score down, or notes strong/consistent performance
- `usePillarTooltip` hook — mobile tap-to-toggle, desktop hover, single-open constraint via `matchMedia('(hover: hover)')`
- Wired into `PillarHeroRow` on the session results page with hover border transition
- 15 tests covering all pillars, sorting, sentence logic edge cases, empty states, accessibility, and interaction

### METRIC_LABELS Deduplication
- Extracted `METRIC_LABELS` constant from 5 duplicate definitions into single source of truth in `pillars.ts`
- Updated imports in `drills/route.ts`, `drills/[id]/complete/route.ts`, `recommendDrill.ts`, `useDrill.ts`, and `session/[id]/page.tsx`

### Mic Loading Animation
- Created `MicLoadingIndicator` component — pulsing sky-blue microphone SVG centered via `fixed inset-0`
- Replaced skeleton/text loading states on 6 route loading files + 2 in-page loading states
- History page uses `pt-32` wrapper to account for header + filter buttons

### UI Color Fixes
- Timer light mode: `text-white` → `text-slate-700` (was invisible on light background)
- Pipeline dark mode: added `dark:bg-slate-800/80`, `dark:text-sky-300`, `dark:bg-slate-700` variants for steps, labels, and borders
- Waveform idle bars: `bg-sky-300/50` → `bg-sky-400/70` (more visible)

## Files touched

- `src/components/ui/PillarTooltip/` (5 new files)
- `src/components/ui/MicLoadingIndicator/` (2 new files)
- `src/features/dashboard/pillars.ts`
- `src/app/(app)/session/[id]/page.tsx`
- `src/app/api/drills/route.ts`, `src/app/api/drills/[id]/complete/route.ts`
- `src/features/training/recommendDrill.ts`, `src/features/training/DrillView/useDrill.ts`
- `src/components/ui/ProcessingStatus/ProcessingStatus.tsx`
- `src/components/ui/SessionTimer/SessionTimer.tsx`
- `src/features/recording/RecordingPanel/RecordingPanel.tsx`
- 6 `loading.tsx` files, `session/new/page.tsx`, `history/page.tsx`

## Key decisions

- **"Brought down" takes priority over "strong"**: If avg >= 8.0 but one metric is >1.0 below average, the drag message is more useful than "strong performance"
- **`Record<string, string>` over `Record<MetricKey, string>`** for METRIC_LABELS: avoids index signature errors since all consumers use `string` keys
- **`fixed inset-0` for MicLoadingIndicator**: true viewport center regardless of parent layout, except history page which wraps with `pt-32` to account for header
- **No API changes**: tooltip content is computed entirely client-side from existing `SessionMetricSnapshot[]` data
