# ENTRY-35 — Pronunciation Feedback UX
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/pronunciation-feedback-ux`
**Version:** `0.32.0`
---
## What I Did

Replaced the raw Azure score dump on the session results page with learner-friendly coaching UI. Score gauges became tier badges (Excellent / Good / Needs Work), the word colour map became an inline sentence with underlined problem words and tooltips, and new sections added Claude coaching tips, a pronunciation history sparkline, and deterministic practice suggestions.

Also shipped auto-segmentation for recordings over 5 minutes: the mic stream stays open, completed segments upload in the background, and a 30-second warning appears before each split.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/ScoreTierBadge/` | Created | Tier badge component |
| `src/components/ui/WordSentenceMap/` | Created | Inline sentence + tooltips |
| `src/components/ui/PronunciationTipsCard/` | Created | Claude coaching tips |
| `src/components/ui/PronunciationProgress/` | Created | Sparkline + trend |
| `src/components/ui/PracticeSuggestion/` | Created | Tongue twisters / drills |
| `src/lib/ai/pronunciationTips.ts` | Created | Haiku tip generator |
| `src/app/api/pronunciation-tips/route.ts` | Created | Auth-gated tips API |
| `src/app/api/sessions/[id]/pronunciation-history/route.ts` | Created | Last 7 sessions history |
| `src/components/ui/PronunciationSection/` | Modified | Tier badges + accordion |
| `src/components/ui/ProsodyPanel/useProsodyPanel.ts` | Modified | Plain English error labels |
| `src/app/(app)/session/[id]/page.tsx` | Modified | All new components wired |
| `src/features/recording/useAudioRecorder.ts` | Modified | Auto-segment at 5 min |
| `src/features/recording/useSegmentUploader.ts` | Created | Background segment uploads |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | Segment warning + status UI |

## Decisions
- **PracticeSuggestion uses a static lookup table** — instant, zero cost, no network latency; tongue twisters are well-known patterns that do not need AI generation.
- **WordColorMap kept in codebase** — not deleted; may serve power users or future A/B testing.
- **History API capped at 7 sessions** — enough for a meaningful sparkline without heavy queries or slow page loads.
- **Tips via REST API route** — consistent with existing auth patterns (`auth()` + Zod validation) rather than a server action exposed to the client.
- **Tier thresholds:** >= 80 Excellent, 60–79 Good, < 60 Needs Work.
- **Sparkline uses relative height scaling** — users with consistently high scores still see bar variation.
- **Tooltip position adapts for first two words** — prevents left-edge clipping on 375px mobile viewports.

## Still Open
- Phoneme-specific exercise selection in PracticeSuggestion (currently error-type based; phoneme keys in map are ready for future phoneme parsing).
- Multi-segment session list view (currently redirects to latest segment session on upload).

## Validation
```bash
npx tsc --noEmit — exit 0
npm run lint — ✔ No ESLint warnings or errors
npm run test — 294 passed | 4 skipped
npm run build — ✓ Compiled successfully
```
