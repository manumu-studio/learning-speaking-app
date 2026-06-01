# Changelog

All notable changes to Learning Speaking App are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.59.0] — 2026-06-01

- **feat:** Register & Pragmatics analysis — 11th metric scoring formality, hedging, and politeness strategies with coaching suggestions
- **feat:** CEFR level estimation — weighted 3-pillar scoring (pronunciation 25%, language 50%, delivery 25%) with C2 threshold requiring all metrics ≥ 8.0
- **feat:** Skill Radar chart — 10-axis SVG visualization with C2 target overlay on dashboard
- **feat:** CEFR Badge — level indicator with longitudinal sparkline trend and next-milestone coaching
- **feat:** CEFR history API — `/api/users/me/cefr-history` for longitudinal level tracking
- **docs:** JSDoc coverage on 37 public API files, 11 per-domain READMEs, OpenAPI spec committed
- **refactor:** Split 4 oversized files into focused modules (all under 300 lines)

## [0.58.0] — 2026-06-01

- **feat:** Collocation SRS + domain vocabulary: SM-2 spaced repetition, collocation detection, domain/frequency tagging, 10th metric (Lexical Sophistication), /vocabulary page

## [0.57.0] — 2026-06-01

- **feat:** Reading Practice personalized library: weakness-targeted AI text generation, AudioWorklet recording, Azure word-by-word scoring

## [0.56.0] — 2026-06-01

- **feat:** Vocabulary-enhanced transcripts: Claude rewrites transcript with suggested vocab bolded; toggle between original and improved

## [0.55.0] — 2026-05-31

- **feat:** Intelligence features: phoneme pattern analysis, vocabulary adoption tracking across sessions, Reading Practice drill mode

## [0.54.0] — 2026-05-31

- **feat:** Observability hardening: withObservability wrapper on all API routes, request ID correlation, Sentry tags, pipeline duration tracking

## [0.53.0] — 2026-05-31

- **feat:** Mobile-first navigation: bottom tab bar (4 tabs), slide-up More sheet, hero recording layout, collapsible prompt categories

## [0.52.1] — 2026-05-31

- **fix:** Pillar score tooltips, pulsing mic loading animation, dark mode fixes, METRIC_LABELS deduplicated to single shared constant

## [0.52.0] — 2026-05-31

- **feat:** Session results overhaul: mobile-first layout, collapsible sections, category-grouped insights, grammar cards, vocab suggestions

## [0.51.0] — 2026-05-31

- **feat:** Parallel chunk pipeline: per-chunk AI processing while recording, overlap-aware transcript stitch, cancel/finish-early flow

## [0.50.0] — 2026-05-31

- **feat:** Recording UX + prosody UI: fast path for short recordings, AudioWorklet for onboarding/drills, progressive results disclosure

## [0.49.0] — 2026-05-30

- **feat:** Pitch contour visualization: Parselmouth/FastAPI microservice, F0 extraction per chunk, SVG pitch contour on session results

## [0.48.0] — 2026-05-28

- **feat:** Accessibility hardening: skip links, keyboard navigation, ARIA live regions, axe automated testing in dev and CI

## [0.47.1] — 2026-05-30

- **fix:** Pipeline hardening: atomic fan-in guard, idempotent final processing, QStash failure callbacks, cron sweeper for stuck sessions

## [0.47.0] — 2026-05-28

- **feat:** Performance and code splitting: lazy landing canvas, Suspense boundaries, route skeletons, Cache-Control headers on GET APIs

## [0.46.0] — 2026-05-28

- **feat:** Observability foundation: Sentry SDK, Pino structured logger replacing console across 20 files, /api/health endpoint, CI smoke test

## [0.45.0] — 2026-05-28

- **feat:** Chunked recording pipeline: AudioWorklet PCM capture, 2-minute WAV chunks, parallel R2 uploads, fan-in final processing

## [0.44.0] — 2026-05-28

- **feat:** AI disclosure consent modal, transcript coaching pins matching insight examples to sentences, Today's Workout hero card

## [0.43.0] — 2026-05-28

- **feat:** Settings page, 28-prompt curated library, and SVG pillar trends page with time-range filtering and metric drill-down

## [0.42.0] — 2026-05-27

- **feat:** Onboarding flow and session history: placement recording gate for new users, paginated activity feed with date filters

## [0.41.0] — 2026-05-27

- **feat:** Personal Records detection: gold ribbons, workout numbering, Workout Weeks streak, dashboard Personal Bests strip

## [0.40.0] — 2026-05-27

- **feat:** Three-pillar dashboard: collapsible Delivery/Language/Pronunciation cards, headline scores, pillar row on session results

## [0.39.0] — 2026-05-27

- **feat:** No-red color system and ScoreChip component: replaces punitive red with coaching-oriented amber/gray palette

## [0.38.0] — 2026-05-27

- **feat:** IPA phoneme display: SAPI-to-IPA mapping table, localStorage toggle (defaults IPA), speaking rate and prosody bug fixes

## [0.37.0] — 2026-05-27

- **feat:** L1 pronunciation bridge rules: 8 new Spanish phoneme rules (21 total), articulatory coaching database, PhonemeDetail UI

## [0.36.0] — 2026-05-27

- **feat:** Recording UX improvements: extended time limits, background processing toast, 15s silence auto-pause

## [0.35.0] — 2026-05-27

- **feat:** Recording UX: guided flow with prompts, live waveform, audio preview, time limits, wake lock, haptic feedback

## [0.34.0] — 2026-05-27

- **feat:** AI analysis quality: coherence scoring, vocabulary diversity metrics, Spanish L1 interference detection, Redis result caching

## [0.33.0] — 2026-05-27

- **feat:** Speaker isolation: push-to-talk, Silero VAD pre-flight, recording state machine, real-time audio level meter

## [0.32.0] — 2026-05-27

- **feat:** Pronunciation feedback UX: tier badges, inline sentence tooltips, Claude coaching tips, sparkline history

## [0.31.0] — 2026-05-27

- **feat:** Whisper hallucination guardrails: confidence gating, domain-biased ASR, Claude prompt guards, NER filter

## [0.30.0] — 2026-05-26

- **feat:** Pronunciation assessment foundation: ffmpeg audio transcoder, Azure Speech SDK client, L1 Spanish interference tagger

## [0.30.0-beta.1] — 2026-05-26

- **feat:** Pronunciation results UI: score gauges, color-coded word map, phoneme drill-down, prosody summary panel

## [0.29.1] — 2026-05-26

- **fix:** Session recording hotfix: auto-grant consent, Blob vs File Node.js compat, Zod null schema, CSP blob: audio playback

## [0.29.0] — 2026-04-04

- **fix:** V5 audit remediation: Zod validation at API boundaries, query consolidation + caching, CI action version fixes, Codecov

## [0.28.0] — 2026-04-03

- **docs:** Documentation: OpenAPI 3.1 spec, Swagger UI, CONTRIBUTING.md, 6 ADRs, architecture diagram, TESTING.md, DEPLOYMENT.md

## [0.27.0] — 2026-04-03

- **feat:** Test coverage to 70%+ statement bar, CSP + security headers in middleware, DB query optimizations

## [0.26.0] — 2026-04-03

- **feat:** E2E and component testing: Playwright critical journeys, React Testing Library UI tests, CI E2E job, E2E auth bypass

## [0.25.0] — 2026-04-03

- **feat:** Testing coverage expansion: 87 new tests (35 to 122 total), shared executePipeline, raised coverage thresholds

## [0.24.0] — 2026-04-03

- **chore:** CI/CD hardening: coverage floors, npm audit, 120 kB bundle budget, Dependabot, CSP/security headers, .nvmrc

## [0.23.0] — 2026-04-02

- **fix:** UI polish: dark mode fixes for dashboard and training, removes unused animation dep, respects prefers-reduced-motion

## [0.22.0] — 2026-04-02

- **feat:** Testing foundation: 87 unit tests for analysis, drills, dashboard, consent; consent gate on session upload API

## [0.21.0] — 2026-04-01

- **refactor:** Pipeline refactor: shared executePipeline function, CI runs tests, App Router error pages

## [0.20.0] — 2026-04-01

- **feat:** Security hardening: middleware-level rate limiting, prompt injection sanitisation, CSRF on all mutations

## [0.19.0] — 2026-04-01

- **chore:** Production hardening: versioned Prisma migrations, GitHub CI, CSRF protection, accessibility, env verification script

## [0.18.0] — 2026-04-01

- **feat:** Advanced drills: precision and conclusion drill variants, training history page, micro-wins, drill stats on dashboard

## [0.17.0] — 2026-03-31

- **feat:** Core drills UI: drill timer, prompt card, feedback display, DrillRecommendation on session results

## [0.16.0] — 2026-03-31

- **feat:** Training system backend: DrillAttempt model, AI drill generation/evaluation, 5 drill types, metric recommendations API

## [0.15.0] — 2026-03-31

- **feat:** Focus-to-session flow: dashboard training focus persisted to localStorage, passed into analysis prompt and results

## [0.14.1] — 2026-03-31

- **feat:** Dashboard UI: weekly stats, metric grid with SVG sparklines, sticky focus selector, skeleton loading

## [0.14.0] — 2026-03-31

- **feat:** Dashboard data layer: 6 MetricSnapshot dimensions, getDashboardData aggregation, dark/light mode toggle

## [0.13.0] — 2026-03-31

- **feat:** Production hardening: Upstash rate limiting, structured logging, error boundaries, SEO metadata

## [0.12.0] — 2026-03-31

- **feat:** Landing page expanded to multi-section scrollable layout: FeatureShowcase, HowItWorks, CtaFooter

## [0.11.0] — 2026-03-05

- **fix:** Fixes signup link OAuth routing, fixes invalid HTML nesting on landing page, updates stale doc branch refs

## [0.10.0] — 2026-02-28

- **feat:** Federated OIDC sign-out (RP-Initiated Logout) — destroys both LSA and upstream auth server sessions

## [0.9.0] — 2026-02-28

- **feat:** Session history page grouped by day; AI-generated intent labels per session

## [0.8.4] — 2026-03-02

- **feat:** Simplifies auth to sign-in on landing page; adds cookie consent banner with GDPR disclosure

## [0.8.3] — 2026-02-23

- **feat:** Completes results page (InsightCard, TranscriptSection), adds dev testing infrastructure

## [0.8.1] — 2026-02-20

- **feat:** QR-gated launch event access: 5-guest token system, countdown page, middleware lockdown

## [0.8.0] — 2026-02-18

- **feat:** Results UI: session status polling, ProcessingStatus indicator, InsightCards, FocusNextBanner

## [0.7.0] — 2026-02-18

- **feat:** Async processing pipeline: QStash job queue, Whisper transcription, Claude analysis, results to Postgres

## [0.6.0] — 2026-02-18

- **feat:** Audio upload API and Cloudflare R2 storage: session CRUD endpoints, upload hook

## [0.5.0] — 2026-02-18

- **feat:** Recording UI with MediaRecorder: useAudioRecorder hook, RecordButton, SessionTimer, RecordingPanel

## [0.4.0] — 2026-02-18

- **feat:** App shell and protected layout: TopBar, MainNav, Container, placeholder pages

## [0.3.0] — 2026-02-18

- **feat:** OIDC auth integration with NextAuth v5 — sign-in/out pages, middleware, protected layout

## [0.2.0] — 2026-02-18

- **feat:** Full 6-model Prisma schema (User, SpeakingSession, Transcript, Insight, PatternProfile) + DB utilities

## [0.1.0] — 2026-02-18

- **feat:** Initial project scaffold: Next.js 15 App Router, TypeScript strict, Tailwind v4, Prisma, ESLint, Husky
