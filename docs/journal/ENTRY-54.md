# ENTRY-54 — Pitch Contour Visualization
**Date:** 2026-05-30
**Type:** Feature
**Branch:** `feat/pitch-visualization`
**Version:** `0.49.0`
---
## What I Did
- Added a Python parselmouth microservice that extracts F0 and intensity contours from presigned chunk audio
- Wired contour extraction into the chunk pipeline before R2 deletion, persisting arrays on `ChunkFeature`
- Built an SVG pitch contour section on session results with a stitched contour API

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `praat-service/**` | Created | FastAPI + Docker deploy |
| `src/lib/praat/**` | Created | Typed HTTP client |
| `src/lib/pipeline/extractFeatures.ts` | Created | Chunk-time extraction |
| `src/components/ui/PitchContour/**` | Created | Results visualization |
| `src/app/api/sessions/[id]/pitch/route.ts` | Created | Stitched contour API |
| `prisma/schema.prisma` | Modified | `ChunkFeature` model |

## Decisions
- Service failure never blocks transcription or pronunciation scoring
- Optional env vars keep local and staging workflows working without Railway
- Unvoiced frames render as gaps in the SVG path

## Still Open
- Deploy `praat-service` to Railway and set Vercel env vars for production contours

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓
npm run lint → ✔
npm test -- --run → 667 passed
```
