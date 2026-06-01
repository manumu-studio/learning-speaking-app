# Trends Feature

> Displays time-series metric trends across configurable date ranges, grouped by coaching pillar.

## Responsibilities
- Fetching metric score history from `/api/trends` with a user-selected time range
- Rendering per-pillar trend cards with sparkline charts
- Showing delta badges (score change over the selected period) per pillar
- Composing the full trends page

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `useTrends.ts` | Fetches and validates trends data; manages `TimeRange` state and exposes `PillarTrendSeries` and `MetricTrendSeries` |
| `trends.types.ts` | Types and Zod schemas: `TimeRange`, `TrendsState`, `PillarTrendSeries`, `MetricTrendSeries`, `TrendsResponse` |
| `TrendsPage/` | Full trends page component — renders pillar cards and range selector |
| `PillarTrendCard/` | Per-pillar card with sparkline; `usePillarTrendCard` derives display values from series data |
| `PillarDeltaBadge/` | Badge showing score delta (▲/▼) for a pillar over the selected range |

## Data Flow
- `useTrends` fetches `/api/trends?range=<7d|30d|90d>` and validates with `TrendsResponseSchema`.
- Data is organized by pillar (Delivery / Language / Pronunciation) using `PILLAR_CONFIG` from the dashboard domain.
- `TrendsPage` passes pillar series to `PillarTrendCard` components; delta values feed `PillarDeltaBadge`.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- Pillar groupings are imported from `features/dashboard/pillars` — trends does not redefine them.
