# PR-0.30.0-rc.1 — Dashboard Pronunciation Metrics + Pipeline Reliability
**Branch:** `feat/dashboard-reliability` → `main`
**Version:** `0.30.0-rc.1`
**Date:** 2026-05-26
**Status:** ✅ Ready to merge
---
## Summary
- Surfaces pronunciation accuracy, prosody, and speaking rate on the main dashboard alongside the existing six speaking metrics
- Hardens the pronunciation pipeline for production: Azure failures are isolated, oversized uploads are rejected at 8 MB, and the feature skips gracefully when Azure credentials are absent
- Sets `maxDuration = 180` on the QStash process route and adds Azure Speech SDK domains to CSP

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/features/dashboard/dashboard.types.ts` | Modified | `PRONUNCIATION_METRIC_KEYS` constant |
| `src/features/dashboard/DashboardView/DashboardView.tsx` | Modified | Speaking + pronunciation sections, empty state |
| `next.config.ts` | Modified | CSP `connect-src` Azure domains |
| `src/app/api/internal/process/route.ts` | Modified | `maxDuration = 180` |
| `src/lib/pipeline/executePipeline.ts` | Modified | Azure failure upsert, warn/info logging |
| `src/app/api/sessions/route.ts` | Modified | 8 MB upload guard (HTTP 413) |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| View-layer metric filtering | Keeps `DashboardData` return shape stable; no API breaking change |
| Failure report with placeholder scores | Schema requires non-null Float fields; `failureReason` signals partial failure |
| 8 MB check before DB/R2 | Fail fast before wasting pipeline compute on files Azure will reject |
| CSP Azure domains now | Documents intent; prevents future browser-side SDK use from being blocked |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (259 tests)
- [x] `npm run build` succeeds
- [ ] Dashboard shows "Pronunciation & Intonation" section (manual)
- [ ] Empty state for users with no pronunciation data (manual)
- [ ] Upload > 8 MB returns 413 (manual)
- [ ] Pipeline completes with Azure disabled (manual)
- [ ] Pipeline completes when Azure throws (manual)

## Deployment Notes
- No schema migrations required
- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` remain optional — pipeline skips pronunciation when absent
- Vercel function timeout now explicitly set to 180s on `/api/internal/process`

## Validation
```
npx prisma generate → ✔ Generated Prisma Client
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 259 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
