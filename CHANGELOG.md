# Changelog

All notable changes to Learning Speaking App are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.68.0] — 2026-06-04

### Added
- Daily meta-session read model: assembles completed sessions, speech quality, pronunciation patterns, general feedback, and transcript modes from raw session data
- Day detail response on `GET /api/daily/[date]` with user-scoped `dayDetail` payload and closed-day status
- Five-section day detail view: Sessions, Speech Quality, Pronunciation & Intonation, General Feedback, and Transcript
- Transcript pronunciation map mode for session results, with word-level pronunciation detail available inside the transcript toggle

### Changed
- History keeps today's sessions open before the 10pm local cutoff; closed/past days render the daily card and detail affordance
- Session results rename Language Feedback to Speech Quality and merge the standalone word color map into the transcript experience
- Daily conclusion generation remains cached, while the visible day detail is rebuilt from the latest scoped session data

## [0.67.0] — 2026-06-03

### Added
- Grammar pipeline: classifies dual-transcript divergence spans as grammar errors, self-corrections, pronunciation artifacts, or false starts via dedicated Claude Haiku call
- Evidence-based `verbAccuracy` scoring: replaces LLM-vibes score with weighted formula (error severity × confidence × corpus boost) when grammar flags are available
- GrammarSection UI component in session results — shows error flags with verbatim vs normalized text, error type badges, suggestions, and corpus evidence
- `grammarFlags` JSON field on SpeakingSession (additive migration, nullable)

### Changed
- Moved `argumentClosure` metric from Delivery pillar to Language pillar (Delivery: 2 metrics, Language: 7)

## [0.66.0] — 2026-06-03

### Added
- Verbatim transcription: AssemblyAI Universal-3-Pro runs in parallel with Whisper and produces a disfluency-preserving transcript (fillers, false starts, repetitions, self-corrections) that Whisper normalises away
- Dual-transcript divergence detection: Levenshtein word-alignment diffs the verbatim transcript against the Whisper display transcript to find divergence spans (insertions, deletions, substitutions) — candidates for downstream grammar-error and disfluency classification
- `ASSEMBLYAI_API_KEY` environment variable (optional); pipeline degrades gracefully to Whisper-only when absent
- 4 nullable fields on `SpeakingSession`: `verbatimTranscript`, `verbatimWordCount`, `divergenceSpans` (JSON), `verbatimProvider`
- Additive Prisma migration `20260603215734_add_verbatim_asr_fields` (non-breaking; all columns nullable)

## [0.65.0] — 2026-06-03

### Added
- Corpus-grounded analysis: Claude receives word frequency, CEFR levels, and collocation attestation data as structured XML alongside every transcript
- Hybrid scoring engine: 6-row decision table confirms/overrides LLM naturalness judgments using corpus signal strength (logDice, MI, frequency)
- Naturalness Tier 2: corpus data upgrades confidence on Claude-flagged collocations, populating `collocationMetric` and `metricValue` fields
- Batch corpus functions: `batchFindCollocations` and `batchAttestExpressions` for single-query multi-item lookups (no N+1)
- Transcript candidate extractor: stop-word-filtered content words, adjacent-word bigrams, and 2-4 word ngrams
- Corpus prompt formatter: generates XML `<corpus-evidence>` section with vocabulary, collocations, expressions, and frequency stats
- Pipeline observability: new `corpus-lookup` stage logged with timing and match counts

### Changed
- `analyzeTranscript` and `buildUserPrompt` refactored from positional params to options objects
- Analysis pipeline now includes a corpus-lookup step before Claude analysis (< 50ms overhead, 3 parallel DB queries)
- Naturalness confidence gate now supports 3-tier enrichment (deterministic calques → corpus-confirmed → Claude-only)

## [0.64.0] — 2026-06-03

- **feat:** Corpus foundation — 3 Prisma models (Lexeme, Collocation, MultiWordExpression) with `pg_trgm` GIN indexes
- **feat:** Seed script ingests 8 academic datasets → 140,886 rows (87,926 lexemes, 52,233 collocations, 757 MWEs)
- **feat:** Query layer — `lookupLexeme`, `batchLookup`, `findCollocation`, `attestExpression` with deterministic source-priority resolution
- **fix:** Source priority was nondeterministic (iterated DB return order instead of SOURCE_PRIORITY array order)
- **chore:** `.gitignore` excludes `data/` (136 MB corpus source datasets)

## [0.63.0] — 2026-06-03

- **feat:** Daily Conclusion engine — structured daily aggregation with pillar deltas, wins/struggles detection, and AI coaching narrative
- **feat:** Language Bank — 4-tier mastery tracking (emerging → mastered), weekday-rotated daily suggestions (12 items, 4 active targets), usage scanning from transcripts, 2-day recycle logic
- **feat:** Prepositional verb bank — 20 curated Spanish-L1 calque targets (depend on, consist of, etc.) with L1 error patterns
- **feat:** Phrasal verb bank — 20 academic/professional register phrasal verbs (carry out, look into, etc.) with separability and register tags
- **feat:** Language Bank Panel — suggestion pills with category colors, mastery badges with progress indicators, active target cards with progress bars
- **feat:** Language Bank API — GET /api/daily/language-bank (items + active targets), POST feedback (usage tracking, target swapping, dismissal)
- **feat:** Subtle DailySummaryCard — redesigned from 3-pillar chips to muted overview with overall score, topic sentence, and "use tomorrow" pills
- **feat:** Day detail page (`/history/day/[date]`) — meta-session view with speech quality, pronunciation, general feedback, and Language Bank sections
- **feat:** Grounded topic sentence — combines deterministic intent labels with Claude Haiku natural phrasing
- **feat:** On-demand lazy generation — conclusions computed and cached when user views history
- **feat:** Pipeline cache invalidation — DailyConclusion cleared alongside DailySummary when new sessions complete
- **change:** DailySummaryCard now fetches from `/api/daily/[date]` instead of `/api/users/me/daily-summaries`

## [0.62.0] — 2026-06-03

- **feat:** Functional-load pronunciation ranking — phoneme and structural errors are now ranked by intelligibility impact (`weight × frequency`), surfacing the highest-leverage fixes first instead of treating all errors equally
- **feat:** Priority Sounds section — the top high-impact pronunciation errors with concrete production rules and IPA-annotated example words (long vowels / diphthongs highlighted)
- **feat:** Accent Polish section — low-impact "accent refinement" items, collapsed and de-emphasised, labeled as optional
- **feat:** Functional-load knowledge base — 12 Bogotá-Spanish L1 → English priorities (phoneme-level and structural patterns like s-cluster epenthesis and dropped final consonants), each with a pronunciation rule and phonetic examples
- **feat:** Structural-pattern detection — s-cluster epenthesis and dropped-final-consonant errors detected from per-word phoneme scores (spelling-proof)
- **change:** Word Map redesigned as a discrete 3-band intelligibility scale — red <60, amber 60–84, green 85+ (raised green floor to 85 for a C2 target), relabeled "Pronunciation Accuracy"

## [0.61.0] — 2026-06-02

- **feat:** Naturalness detection pipeline — 5th Language Feedback category detecting awkward-but-grammatical phrasing, L1 transfer calques, and under-idiomatic collocations
- **feat:** Deterministic calque checklist — 30 Bogotá-Spanish transfer patterns (false friends, calqued collocations, calqued syntax) with high-confidence flagging
- **feat:** Claude Haiku naturalness extension — discourse markers, hedging, register mismatch, and rhythm issues flagged as low-confidence "style notes"
- **feat:** Confidence gate — 3-tier system merging deterministic calques (high) with Claude-only detections (low), deduplicating overlapping flags
- **feat:** NaturalnessFlagCard UI — original→suggested corrections with L1 source, confidence badges (amber/blue/gray), and rationale
- **feat:** NaturalnessInsights section — groups flags by confidence tier inside Language Feedback
- **feat:** User feedback API — thumbs up/down on each naturalness flag for precision tuning
- **feat:** `NaturalnessFlag` Prisma model with session and user relations

## [0.60.1] — 2026-06-02

- **refactor:** Removed all ESLint complexity-rule suppressions — the codebase now lints clean with `max-lines`, `max-lines-per-function`, `complexity`, `max-depth`, and `max-params` enforced as hard CI-blocking errors (zero inline `eslint-disable` overrides remain in `src/`)
- **refactor:** Split 82 oversized files into 87 focused single-responsibility modules across library code, UI components, feature modules, API routes, and pages — 169 files touched in total
- **refactor:** Extracted sub-components, custom hooks, helper utilities, query builders, view-model files, and schema modules while preserving every public API unchanged
- **chore:** No behavior change — all 1,139 tests pass, `npx tsc --noEmit` clean, `npm run lint` clean

## [0.60.0] — 2026-06-01

- **feat:** Prompt Library v2 — expanded from 28 to 60+ prompts with 6 format types (opinion, monologue, image, retell, summarize, impromptu) and C2-level content
- **feat:** Multi-filter system — pill-style AND-combined filters for category, format, and CEFR level replacing single category tabs
- **feat:** 4-3-2 Timed Fluency training — research-backed 3-round exercise (4→3→2 min) with countdown timer, auto-stop, grace period, and WPM comparison view
- **feat:** Fluency data model — `TimedFluencySession` + `TimedFluencyRound` Prisma models with status tracking and metric backfill
- **feat:** 3 fluency API routes (create/list sessions, session detail, submit rounds with auto-completion)
- **feat:** `LibraryPromptCard` updated with format badges, collapsible source text, dual action buttons (Quick Record + Start 4-3-2)
- **feat:** Fluency Training added to MoreSheet navigation with clock icon
- **feat:** 8 retell source passages and 8 image prompt metadata entries
- **feat:** Daily Summary cards — past days in history and reading practice show pillar averages, new vocab, and AI coaching feedback (Claude Haiku)
- **feat:** `DailySummary` Prisma model with on-demand compute + cache invalidation on session completion
- **feat:** History and reading practice day groups collapsed by default for past days with expand/collapse toggle

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
