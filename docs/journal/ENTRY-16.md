# ENTRY-16 — Training system backend (drills)

**Date:** 2026-03-31
**Type:** Feature
**Branch:** `feature/training-architecture`
**Version:** `0.16.0`

---

## What I Did

Shipped the server-side training layer: database model for drill attempts, Claude Haiku helpers to generate personalized drill copy and to score a single response against one metric, a recommendation function that reads session metrics and transcript context, REST endpoints to create and complete drills (including short audio through the existing Whisper path and immediate R2 deletion), and seed data for local testing.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `DrillAttempt`, relations, optional `focusMetricKey` on sessions |
| `prisma/seed.ts` | Modified | Drill rows + cleanup order |
| `src/lib/ai/client.ts` | Created | Shared Anthropic client |
| `src/lib/ai/analyze.ts` | Modified | Consumes shared client |
| `src/features/training/training.types.ts` | Created | Drill-related types |
| `src/features/training/index.ts` | Created | Barrel |
| `src/features/training/generateDrill.ts` | Created | Prompt generation |
| `src/features/training/evaluateDrill.ts` | Created | Micro-feedback |
| `src/features/training/recommendDrill.ts` | Created | Post-session recommendation |
| `src/app/api/drills/route.ts` | Created | Create drill |
| `src/app/api/drills/[id]/route.ts` | Created | Drill detail |
| `src/app/api/drills/[id]/complete/route.ts` | Created | Submit audio, transcribe, feedback |

## Decisions

- Kept one Haiku model string aligned with the existing analysis client so behavior and billing stay consistent.
- Stored an optional metric key on the session row so “user-chosen focus” can override “lowest score” without parsing free-text focus strings.
- After transcription, drill audio is removed from object storage using the same privacy posture as full sessions.

## Still Open

- Product UI to start drills and display recommendations.
- Wiring the dashboard focus control to persist `focusMetricKey` when the user confirms a focus.

## Validation

- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run` — all passing in dev.
- Apply schema and run the seed script against your hosted database when connected.
