# PR-0.49.0 — Pitch Contour Visualization
**Branch:** `feat/pitch-visualization` → `main`
**Version:** `0.49.0`
**Date:** 2026-05-30
**Status:** ✅ Ready to merge
---
## Summary
- Parselmouth microservice extracts F0/intensity contours for visualization only
- Chunk pipeline persists `ChunkFeature` before deleting audio from R2
- Session results show an SVG pitch contour when feature data exists

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `praat-service/**` | Created | Railway-deployable FastAPI service |
| `src/lib/praat/**` | Created | Client + Zod schemas |
| `src/lib/pipeline/extractFeatures.ts` | Created | Non-blocking extraction |
| `src/components/ui/PitchContour/**` | Created | 4-file SVG component |
| `src/app/api/sessions/[id]/pitch/route.ts` | Created | Auth-scoped stitch API |
| `prisma/migrations/20260530230000_add_chunk_features/` | Created | `chunk_features` table |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Separate Python service | parselmouth/Praat not viable on Vercel Node runtime |
| Optional Praat env | Dev and staging work without deployed microservice |
| Extract before R2 delete | ~60s retention policy still met; features live in Postgres |
| Server-side stitch | One fetch for full-session contour on results page |

## Testing Checklist
- [ ] Run `prisma migrate deploy` on Neon
- [ ] Deploy `praat-service` and set `PRAAT_SERVICE_URL` + `PRAAT_API_KEY` on Vercel
- [ ] Record a chunked session; confirm `chunk_features` rows after processing
- [ ] Open session results; pitch contour appears below pronunciation section
- [ ] Disable Praat env; pipeline still completes without contour UI

## Deployment Notes
1. Deploy `praat-service/` to Railway (Dockerfile includes ffmpeg)
2. Set `API_KEY` on Railway and matching `PRAAT_API_KEY` on Vercel
3. Set `PRAAT_SERVICE_URL` to the Railway public URL
4. Apply Prisma migration `20260530230000_add_chunk_features`

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run build → ✓ Compiled successfully
npx prisma validate → valid 🚀
npm test -- --run → 667 passed | 4 skipped
```
