# PR-0.32.0 — Pronunciation Feedback UX
**Branch:** `feat/pronunciation-feedback-ux` → `main`
**Version:** `0.32.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Replaced raw Azure score gauges with Excellent/Good/Needs Work tier badges
- Replaced word colour map with inline underlined sentence + hover tooltips
- Added Claude Haiku coaching tips via `/api/pronunciation-tips`
- Added pronunciation history API and sparkline progress indicator
- Added deterministic practice suggestion (tongue twisters + drill phrases)
- Auto-segmentation at 5 minutes with background upload and warning UI
- Plain English labels throughout — no raw Azure SDK strings visible to users

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/ScoreTierBadge/` | Created | Coloured badge per dimension |
| `src/components/ui/WordSentenceMap/` | Created | Inline sentence + tooltips |
| `src/components/ui/PronunciationTipsCard/` | Created | 2–3 Claude coaching tips |
| `src/components/ui/PronunciationProgress/` | Created | Sparkline + trend sentence |
| `src/components/ui/PracticeSuggestion/` | Created | Targeted drill phrase |
| `src/lib/ai/pronunciationTips.ts` | Created | Haiku tip generator |
| `src/app/api/pronunciation-tips/route.ts` | Created | Auth-gated tips endpoint |
| `src/app/api/sessions/[id]/pronunciation-history/route.ts` | Created | Last 7 sessions |
| `src/components/ui/PronunciationSection/` | Modified | Tier badges + collapsed accordion |
| `src/components/ui/ProsodyPanel/useProsodyPanel.ts` | Modified | Plain English error labels |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Integrates all new components |
| `src/features/recording/useAudioRecorder.ts` | Modified | Auto-segment hook |
| `src/features/recording/useSegmentUploader.ts` | Created | Background upload queue |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | Warning banner + segment pills |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Static exercise lookup for PracticeSuggestion | Zero latency, no API cost; drills are deterministic |
| WordColorMap retained | Available for power-user toggle or future A/B test |
| History capped at 7 sessions | Balances trend context vs query latency |
| Tips via REST route (not server action) | Matches existing auth + Zod validation patterns |
| Auto-segment keeps MediaStream open | No mic permission re-prompt between segments |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (294 tests)
- [x] `npm run build` succeeds
- [ ] Session results page verified at 375px, 768px, 1280px (manual)
- [ ] Tier badges render correctly in light and dark mode (manual)
- [ ] Coaching tips load on session with pronunciation data (manual)
- [ ] Auto-segment warning appears 30s before 5-min split (manual)

## Deployment Notes
- No schema migrations required
- No new environment variables required
- Uses existing `ANTHROPIC_API_KEY` for coaching tips
- Claude model: `claude-haiku-4-5`

## Validation
```
npx tsc --noEmit — exit 0
npm run lint — ✔ No ESLint warnings or errors
npm run test — 294 passed | 4 skipped
npm run build — ✓ Compiled successfully
```
