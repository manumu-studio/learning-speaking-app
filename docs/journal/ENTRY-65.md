# Journal Entry 65 — 2026-06-01

**Type:** Feature
**Branch:** `feat/register-cefr-estimation`
**Version:** 0.59.0

## Summary

Added Register & Pragmatics analysis as the 11th metric dimension and CEFR-level estimation from weighted pillar scores. The register assessment evaluates formality appropriateness, hedging adequacy, and politeness strategies — critical for the C1→C2 gap where learners are grammatically correct but pragmatically off. CEFR estimation maps all 11 metrics to a rubric (below-C1 through C2) and presents it as a coaching indicator with longitudinal sparkline tracking.

## What was built

1. **Register & Pragmatics metric** — `registerPragmatics` added as 11th metric key across all 12 source files. Claude analysis prompt extended with a new `REGISTER_PRAGMATICS_PROMPT_SECTION` evaluating register, hedging, politeness strategies, and pragmatic competence. Produces structured `registerFeedback` JSON stored on the session.

2. **CEFR estimation utility** — Pure function `estimateCefr()` that takes metric scores, computes weighted pillar averages (pronunciation 25%, language 50%, delivery 25%), and maps to CEFR levels. Handles missing metrics gracefully via proportional weight redistribution. 16 unit tests covering all threshold boundaries and edge cases.

3. **Skill Radar chart** — Hand-drawn SVG radar with 10 axes at 36-degree intervals, score polygon, dashed C2 threshold ring at 8.0, hover tooltips, and responsive scaling. No chart library.

4. **CEFR Badge** — Shows current level with color-coded badge, weighted average, SVG sparkline of last 8 sessions, and "next milestone" coaching copy.

5. **Register Feedback UI** — Classification badges (register, appropriateness, hedging, directness), coaching note, and before/after suggestion pairs. Integrated into the Language Feedback section of the session results page.

6. **CEFR History API** — `GET /api/users/me/cefr-history` derives historical CEFR levels from MetricSnapshot data per session. Powers the sparkline.

7. **Pipeline integration** — All three pipeline paths (executePipeline, processFinal, processParallelFinal) now compute and store CEFR level on `User.estimatedCefrLevel` after each session.

8. **Major file splits** — Split 4 oversized files (719, 580, 503, 503 lines) into 15 focused modules. All under 300 lines (except prompt string constants at 425 lines). Zero regressions — 990 tests still passing.

## Files created

- `src/lib/ai/analyzePrompts.ts` — prompt section constants + builder functions
- `src/lib/pipeline/processParallelFinal.ts` — parallel fan-in worker
- `src/lib/pipeline/processFinalHelpers.ts` — shared parser/validator helpers
- `src/features/training/ReadingPractice/PracticeView.tsx` — practice view UI
- `src/features/training/ReadingPractice/GlobalSummary.tsx` — weakness summary
- `src/features/training/ReadingPractice/SessionCard.tsx` — session card
- `src/app/(app)/session/[id]/sessionResults.helpers.ts` — utility functions
- `src/app/(app)/session/[id]/PillarHeroRow.tsx` — pillar score row
- `src/app/(app)/session/[id]/CategoryInsightsSection.tsx` — insight grouping
- `src/app/(app)/session/[id]/SessionDoneView.tsx` — done view orchestrator
- `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` — feedback sections
- `src/lib/cefr/cefr.types.ts` — CEFR type definitions
- `src/lib/cefr/estimateCefr.ts` — estimation pure function
- `src/lib/cefr/estimateCefr.test.ts` — 16 unit tests
- `src/features/dashboard/SkillRadar/` — 4-file component
- `src/features/dashboard/CefrBadge/` — 3-file component
- `src/features/session/RegisterFeedback/RegisterFeedback.tsx` — feedback UI
- `src/app/api/users/me/cefr-history/route.ts` — history API

## Files modified

- `src/lib/ai/analyze.ts` — registerFeedback Zod schema + registerPragmatics metric key
- `src/lib/metric-keys.ts` — added registerPragmatics
- `src/features/dashboard/dashboard.types.ts` — cefrEstimate + radarScores
- `src/features/dashboard/getDashboardData.ts` — computes CEFR + radar scores
- `src/features/dashboard/DashboardView/useDashboard.ts` — Zod schema for new fields
- `src/features/dashboard/DashboardView/DashboardView.tsx` — renders SkillRadar + CefrBadge
- `src/features/dashboard/pillars.ts` — registerPragmatics in Language pillar
- `src/features/session/useSessionStatus.types.ts` — registerFeedback on SessionDetail
- `src/lib/pipeline/executePipeline.ts` — CEFR estimation after metrics
- `src/lib/pipeline/processFinal.ts` — CEFR estimation in fan-in
- `src/lib/pipeline/processParallelFinal.ts` — CEFR estimation in parallel fan-in
- `prisma/schema.prisma` — estimatedCefrLevel + registerFeedback fields

## Key decisions

- **Weighted CEFR rubric** with strict C2 rule (requires ALL metrics ≥ 8.0 AND weighted avg ≥ 8.5) to prevent premature C2 claims
- **No chart library** for radar — pure SVG with `viewBox`-based responsive scaling
- **CEFR history derived on-the-fly** from MetricSnapshot data rather than a separate history table
- **File splits prioritized** before feature work to keep all files under 300 lines
