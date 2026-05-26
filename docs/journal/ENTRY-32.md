# ENTRY-32 — Dashboard Pronunciation Metrics + Pipeline Reliability
**Date:** 2026-05-26
**Type:** Feature
**Branch:** `feat/dashboard-reliability`
**Version:** `0.30.0-rc.1`
---
## What I Did
- Added a "Pronunciation & Intonation" section to the dashboard with three MetricCards (accuracy, prosody, speaking rate) and an empty state for users without pronunciation data
- Split the dashboard into "Speaking Patterns" (6 Claude metrics) and pronunciation metrics using a typed key constant
- Hardened the pronunciation pipeline: `maxDuration = 180` on the process route, Azure failure isolation with `failureReason`, graceful skip when credentials are absent, and 8 MB upload rejection
- Confirmed idempotent persistence (upsert + delete-then-createMany) was already in place from the pipeline integration work
- Audit remediation: moved inline types to `.types.ts`, made pronunciation cards display-only (no focus selection), shared `AZURE_SDK_VERSION` constant

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/features/dashboard/dashboard.types.ts` | Modified | Pronunciation metric key constant |
| `src/features/dashboard/DashboardView/DashboardView.tsx` | Modified | Two metric sections + empty state |
| `src/features/dashboard/DashboardView/DashboardView.types.ts` | Modified | Extracted metric card types |
| `src/features/dashboard/MetricCard/MetricCard.tsx` | Modified | Optional onSelect for display-only cards |
| `next.config.ts` | Modified | Azure CSP domains |
| `src/app/api/internal/process/route.ts` | Modified | Vercel max duration |
| `src/lib/pipeline/executePipeline.ts` | Modified | Failure isolation + skip logging |
| `src/lib/pipeline/persistPronunciation.ts` | Modified | Exported AZURE_SDK_VERSION |
| `src/app/api/sessions/route.ts` | Modified | 8 MB upload guard |

## Decisions
- Filter pronunciation metrics in the view layer rather than changing `getDashboardData` — keeps the data API stable and avoids duplicate fetching logic
- Use placeholder scores (0) on failed pronunciation reports because the schema requires non-null score fields; `failureReason` carries the diagnostic signal
- Check file size before any DB or storage writes to fail fast on oversized recordings
- Pronunciation MetricCards are display-only — drill system only maps the 6 Claude-scored keys

## Still Open
- Manual verification of end-to-end Azure scoring and QStash retry idempotency in staging
- Dashboard empty state assumes score 0 + empty history means "no data" — a legitimate zero score with history would still render cards

## Validation
```
npx prisma generate → ✔
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 259 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
