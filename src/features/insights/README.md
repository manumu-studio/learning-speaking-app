# Insights Feature

> Placeholder domain for AI-generated insight cards; currently contains only the loading skeleton.

## Responsibilities
- Provides the `InsightCardSkeleton` loading component used while insight data is being fetched.
- Reserved for future expansion of session insight cards and pattern-based coaching summaries.

## Key Modules
| File | Purpose |
|------|---------|
| `InsightCardSkeleton.tsx` | Animated pulse skeleton matching the insight card layout |

## Data Flow
- No data fetching in this domain yet. `InsightCardSkeleton` is a pure presentational component consumed by other features during loading states.

## Conventions
- 4-file component pattern will apply once full components are added.
- `.gitkeep` preserves the directory in version control.
