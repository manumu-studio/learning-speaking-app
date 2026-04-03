# ADR-005: Six fixed metrics with MetricSnapshot per session

**Date:** 2026-04-03  
**Status:** Accepted  

## Context

The product promises **trend lines**, **dashboard cards**, and **drills targeted at weak areas**. Free-form string tags from the model would not support consistent charts, comparisons, or drill generation keyed by stable identifiers.

## Decision

Define exactly **six speaking metrics** (`MetricKey` in `src/features/dashboard/dashboard.types.ts` and `metricSchema` in `src/lib/ai/analyze.ts`): connector repetition, structural variety, vocabulary precision, verb accuracy, argument closure, filler usage. Each processed session stores **`MetricSnapshot`** rows in Postgres (`prisma/schema.prisma`) with `key`, `level`, `score`, and `note`. The dashboard aggregates history arrays per key in `getDashboardData.ts`. Focus comparison for a session uses `focusMetricKey` on `SpeakingSession` plus `GET /api/sessions/[id]/focus-comparison`.

## Alternatives considered

- **Fully dynamic metrics from the model** — flexible but breaks UI assumptions and historical comparability.
- **User-defined custom metrics** — high UX complexity for marginal gain at current scale.
- **Single aggregate score only** — too coarse for coaching feedback.

## Consequences

- **Pros:** Predictable schema; sparklines and drill stats share one vocabulary; Zod enforces allowed keys on AI output.
- **Cons:** Adding a seventh metric requires coordinated changes (Prisma, prompts, dashboard, OpenAPI, tests).
- **Data:** `MetricSnapshot` uniqueness on `(sessionId, key)` prevents duplicates per session.
