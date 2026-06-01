# Dashboard Feature

> Renders the main user dashboard — weekly stats, streak, per-metric scores grouped into three pillars, drill activity, and personal records.

## Responsibilities
- Aggregating session and drill data into a `DashboardData` object (server-side, cached 60s)
- Computing the three coaching pillars: Delivery, Language, Pronunciation
- Displaying metric cards with sparklines, trend direction, and "last trained today" badges
- CEFR level estimation and SkillRadar visualization
- Metric focus selection (persisted to `localStorage`)
- Personal record detection and display strip
- Today's recommended workout card

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `getDashboardData.ts` | Server data function — parallelized Prisma queries, streak/trend computation, `unstable_cache` wrapper |
| `pillars.ts` | `PILLAR_CONFIG` definition, `computePillarScores()` — groups 11 metrics into Delivery / Language / Pronunciation |
| `dashboard.types.ts` | Shared types: `DashboardData`, `MetricKey`, `DashboardMetric`, `TrendDirection` |
| `DashboardView/` | Top-level view component; `useDashboard` fetches `/api/dashboard` and manages focus state |
| `MetricCard/` | Individual metric card with sparkline, level badge, trend arrow |
| `PillarCard/` | Pillar summary card with average score and constituent metrics |
| `SkillRadar/` | SVG radar chart across all 11 metrics |
| `FocusSelector/` | Dropdown to pick a training focus metric (saved to `localStorage`) |
| `FocusBanner/` | Banner shown during recording when a focus metric is active |
| `PersonalRecordStrip/` | Highlights all-time personal bests per metric |
| `TodaysWorkout/` | Recommended session or drill for the current day |
| `IdentitySummary/` | CEFR badge + workout streak summary row |
| `CefrBadge/` | CEFR level label component |
| `DashboardSkeleton/` | Loading skeleton for the full dashboard layout |
| `todaysWorkout.ts` | Logic for selecting today's workout recommendation |

## Data Flow
- `getDashboardData(userId)` is called in the `/app/dashboard` Server Component and passed as props, or fetched client-side via `/api/dashboard`.
- `useDashboard` (client) calls `/api/dashboard`, validates the response with Zod, and exposes `data`, `focus`, `setFocus`, and `clearFocus`.
- Focus state is persisted to `localStorage` under key `lsa-focus`.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- No chart library — sparklines are rendered as inline SVG.
- Pillar configuration is the single source of truth for metric groupings.
