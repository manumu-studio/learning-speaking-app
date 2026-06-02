# PR-0.61.0 — Naturalness Detection Pipeline

**Branch:** `feat/speech-analysis-naturalness` → `main`
**Version:** `0.61.0`
**Date:** 2026-06-02
**Status:** ✅ Ready to merge

---

## Summary

Adds a **Naturalness** dimension to the per-session Language Feedback section — the 5th analysis category. Detects awkward-but-grammatical phrasing, L1 transfer calques (Bogotá-Spanish), and under-idiomatic collocations using a hybrid pipeline: deterministic calque matching (30 items, high confidence) plus Claude Haiku detection (low confidence, "style note" treatment).

Users can provide thumbs up/down feedback on each flag for future precision tuning.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | NaturalnessFlag model |
| `prisma/migrations/20260602120000_add_naturalness_flag/` | Created | Migration |
| `src/lib/naturalness/` (7 files) | Created | Types, calque list, detection engine, confidence gate + tests |
| `src/lib/ai/analyze.ts` | Modified | Naturalness array in Zod schema |
| `src/lib/ai/analyzePromptSections.ts` | Modified | NATURALNESS_PROMPT_SECTION |
| `src/lib/ai/analyzePrompts.ts` | Modified | Prompt wiring |
| `src/lib/ai/analyzePromptSchema.ts` | Modified | JSON schema extension |
| `src/lib/pipeline/processFinal.ts` | Modified | Pipeline integration |
| `src/lib/pipeline/persistNaturalness.ts` | Created | Persistence helper |
| `src/app/api/sessions/[id]/route.ts` | Modified | Include naturalness in response |
| `src/features/session/useSessionStatus.types.ts` | Modified | Client types |
| `src/features/session/useSessionStatus.ts` | Modified | Zod schema + transform |
| `src/components/ui/NaturalnessFlagCard/` (3 files) | Created | Flag card component |
| `src/features/session/NaturalnessInsights/` (3 files) | Created | Insights section |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | UI wiring |
| `src/app/api/naturalness/[flagId]/feedback/route.ts` | Created | Feedback endpoint |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Precision-first (≥90% target) | F0.5 metric standard — false positives damage trust for advanced learners |
| 3-tier confidence system | Calque list (high) vs Claude+corpus (medium, deferred) vs Claude-only (low) |
| Deterministic calque checklist | 30 items hardcoded — zero latency, zero cost, 100% precision |
| Idempotent flag persistence | Delete + recreate per session — handles reprocessing cleanly |
| Feedback collection | Thumbs up/down per flag → future precision tuning data |

## Testing Checklist

- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — clean build
- [x] `npm run lint` — zero warnings
- [x] `npm test -- --run` — 147 files, 1158 tests, all passing
- [ ] Record a session with Spanish-transfer phrases → verify flags appear
- [ ] Verify feedback thumbs up/down persists correctly
- [ ] Verify low-confidence flags render with gray "Style Note" treatment

## Deployment Notes

- **Migration required:** `npx prisma migrate deploy` — adds `naturalness_flags` table
- No new environment variables
- No breaking API changes (naturalness flags are additive)
