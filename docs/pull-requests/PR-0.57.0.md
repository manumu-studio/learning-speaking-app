# PR — Reading Practice Library (v0.57.0)

**Branch:** `feat/reading-practice-library` → `main`
**Date:** 2026-06-01

## Summary

Replaces the generic reading practice stub with a full-featured personalized library. Users browse past sessions with pronunciation weaknesses highlighted, select one, choose a difficulty level, and get AI-generated text targeting their specific weak phonemes and vocabulary. They can then record themselves reading the text and receive word-by-word pronunciation scores via Azure Speech assessment.

Also adds catch-all not-found pages that redirect unknown routes instead of showing a blank 404.

## What Was Built

### Reading Practice Library (replaces `/drill/reading-practice`)
- **Global weakness summary** — aggregated weak phonemes + unadopted vocab across all sessions
- **Per-session cards** — each session shows workout number, topic, pronunciation score, weak phonemes (IPA), mispronounced words, and suggested vocabulary
- **Difficulty selector** — Easy / Medium / Hard with descriptions
- **AI text generation** — Claude generates 2-4 sentences targeting session-specific weaknesses
- **Recording flow** — record reading via AudioWorklet, single-chunk capture
- **Pronunciation assessment** — audio sent to Azure Speech for word-by-word scoring
- **Results view** — color-coded words (green/amber/orange by accuracy), target words underlined, overall score chip

### Not-Found Redirects
- `src/app/not-found.tsx` — redirects unknown root routes to `/`
- `src/app/(app)/not-found.tsx` — redirects unknown app routes to `/dashboard`

## Architecture Decisions

- **Direct FormData upload** for assessment (no R2 presigned URL) — reading practice audio is short (<30s), so direct upload to the assess endpoint is simpler and avoids orphaned R2 files
- **Single API for library data** — one `GET /api/users/me/reading-practice-sessions` returns both global + per-session aggregation to minimize round trips

## Testing

- `npx tsc --noEmit` ✅
- `npm run build` ✅
- `npm test` — 913 passed, 130 test files ✅

## Deployment Notes

No database migration needed. No new environment variables — uses existing `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`.
