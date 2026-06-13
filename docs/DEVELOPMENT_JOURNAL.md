# Development Journal

A chronological record of feature development for the Learning Speaking App.

---

## Entries

| Version | Entry | Date | Summary |
|---------|-------|------|---------|
| 0.1.0 | [ENTRY-1](journal/ENTRY-1.md) | — | Project scaffold |
| 0.2.0 | [ENTRY-2](journal/ENTRY-2.md) | — | Database setup |
| 0.3.0 | [ENTRY-3](journal/ENTRY-3.md) | — | Auth integration |
| 0.3.0 | [ENTRY-3b](journal/ENTRY-3b.md) | — | Auth fixes |
| 0.4.0 | [ENTRY-4](journal/ENTRY-4.md) | — | App shell |
| 0.5.0 | [ENTRY-5](journal/ENTRY-5.md) | — | Recording UI |
| 0.5.0 | [ENTRY-5b](journal/ENTRY-5b.md) | — | Recording integration |
| 0.6.0 | [ENTRY-6](journal/ENTRY-6.md) | — | Upload + storage |
| 0.6.0 | [ENTRY-6b](journal/ENTRY-6b.md) | — | Session API |
| 0.7.0 | [ENTRY-7a](journal/ENTRY-7a.md) | — | QStash + Whisper |
| 0.7.0 | [ENTRY-7b](journal/ENTRY-7b.md) | — | Claude analysis |
| 0.7.0 | [ENTRY-7c](journal/ENTRY-7c.md) | — | Pipeline orchestration |
| 0.8.0 | [ENTRY-8a](journal/ENTRY-8a.md) | — | Session status |
| 0.8.0 | [ENTRY-8b](journal/ENTRY-8b.md) | — | Session status fixes |
| 0.8.0 | [ENTRY-8c](journal/ENTRY-8c.md) | — | Session status polish |
| 0.9.0 | [ENTRY-9](journal/ENTRY-9.md) | 2026-02-28 | Session history + intent labels |
| 0.10.0 | [ENTRY-10](journal/ENTRY-10.md) | — | Federated sign-out |
| 0.10.0 | [ENTRY-10a](journal/ENTRY-10a.md) | — | Federated sign-out fixes |
| 0.11.0 | [ENTRY-11](journal/ENTRY-11.md) | — | Landing page sign-in + cookie consent |
| — | [ENTRY-launch](journal/ENTRY-launch.md) | — | Launch event |
| 0.12.0 | [ENTRY-12](journal/ENTRY-12.md) | 2026-03-31 | Landing page sections |
| 0.13.0 | [ENTRY-13](journal/ENTRY-13.md) | 2026-03-31 | Polish, rate limiting & production readiness |
| 0.14.0 | [ENTRY-14](journal/ENTRY-14.md) | 2026-03-31 | Dashboard data layer + dark mode |
| 0.14.0 | [ENTRY-14b](journal/ENTRY-14b.md) | 2026-03-31 | Dashboard UI |
| 0.15.0 | [ENTRY-15](journal/ENTRY-15.md) | 2026-03-31 | Focus-to-session flow |
| 0.16.0 | [ENTRY-16](journal/ENTRY-16.md) | 2026-03-31 | Training system backend (drills) |
| 0.17.0 | [ENTRY-17](journal/ENTRY-17.md) | 2026-03-31 | Core drills UI |
| 0.18.0 | [ENTRY-18](journal/ENTRY-18.md) | 2026-04-01 | Advanced drills, history, dashboard drill stats |
| 0.19.0 | [ENTRY-19](journal/ENTRY-19.md) | 2026-04-01 | Production hardening (migrations, CI, CSRF, a11y, env) |
| 0.20.0 | [ENTRY-20](journal/ENTRY-20.md) | 2026-04-01 | Security hardening (CSRF coverage, API rate limit middleware, prompt sanitisation) |
| 0.21.0 | [ENTRY-21](journal/ENTRY-21.md) | 2026-04-01 | Pipeline refactor, CI tests, App Router error surfaces |
| 0.22.0 | [ENTRY-22](journal/ENTRY-22.md) | 2026-04-02 | Testing foundation (Vitest + Prisma mocks, drill/dashboard tests, consent on session upload) |
| 0.23.0 | [ENTRY-23](journal/ENTRY-23.md) | 2026-04-02 | UI polish: dark mode, reduced motion, a11y, remove unused animation dependency |
| 0.24.0 | [ENTRY-24](journal/ENTRY-24.md) | 2026-04-03 | CI/CD pipeline hardening: tests in CI, coverage, security headers, error/loading surfaces, Dependabot |
| 0.25.0 | [ENTRY-25](journal/ENTRY-25.md) | 2026-04-03 | Unit & integration testing coverage (0.25.0) |
| 0.26.0 | [ENTRY-26](journal/ENTRY-26.md) | 2026-04-03 | E2E (Playwright) + component tests (RTL) |
| 0.27.0 | [ENTRY-27](journal/ENTRY-27.md) | 2026-04-03 | Coverage thresholds, CSP, route boundaries, CI + Dependabot hardening |
| 0.28.0 | [ENTRY-28](journal/ENTRY-28.md) | 2026-04-03 | Documentation excellence — OpenAPI, guides, ADRs, Swagger UI (dev) |
| 0.29.0 | [ENTRY-29](journal/ENTRY-29.md) | 2026-04-04 | V5 audit remediation |
| 0.30.0-beta.1 | [ENTRY-31](journal/ENTRY-31.md) | 2026-05-26 | Pronunciation results UI on session page |
| 0.30.0-rc.1 | [ENTRY-32](journal/ENTRY-32.md) | 2026-05-26 | Dashboard pronunciation metrics + pipeline reliability |
| 0.31.0 | [ENTRY-34](journal/ENTRY-34.md) | 2026-05-27 | Whisper hallucination guardrails |
| 0.32.0 | [ENTRY-35](journal/ENTRY-35.md) | 2026-05-27 | Pronunciation feedback UX overhaul |
| 0.33.0 | [ENTRY-37](journal/ENTRY-37.md) | 2026-05-27 | Speaker isolation: push-to-talk, VAD pre-flight, validation gates |
| 0.34.0 | [ENTRY-38](journal/ENTRY-38.md) | 2026-05-27 | AI analysis quality: coherence, vocabulary diversity, L1 detection, Redis caching |
| 0.60.1 | [ENTRY-67](journal/ENTRY-67.md) | 2026-06-02 | ESLint complexity compliance — zero suppressions, 82 files split into 87 focused modules |
| 0.61.0 | [ENTRY-68](journal/ENTRY-68.md) | 2026-06-02 | Pronunciation redesign — functional-load prioritization with rules + IPA |
| 0.62.0 | [ENTRY-69](journal/ENTRY-69.md) | 2026-06-03 | Daily conclusion engine + language bank system |
| 0.63.0 | [ENTRY-70](journal/ENTRY-70.md) | 2026-06-03 | Audit remediation — N+1 query, VAD Zod guard, CI parallel split |
| 0.64.0 | [ENTRY-71](journal/ENTRY-71.md) | 2026-06-03 | Corpus foundation — 3 models, seed script, query layer |
| 0.65.0 | [ENTRY-72](journal/ENTRY-72.md) | 2026-06-03 | Corpus-grounded scoring — evidence builder, hybrid engine, Tier 2 naturalness |

## Pull Requests

| Version | PR | Date | Summary |
|---------|-----|------|---------|
| 0.1.0 | [PR-0.1.0](pull-requests/PR-0.1.0.md) | — | Project scaffold |
| 0.2.0 | [PR-0.2.0](pull-requests/PR-0.2.0.md) | — | Database setup |
| 0.3.0 | [PR-0.3.0](pull-requests/PR-0.3.0.md) | — | Auth integration |
| 0.4.0 | [PR-0.4.0](pull-requests/PR-0.4.0.md) | — | App shell |
| 0.5.0 | [PR-0.5.0](pull-requests/PR-0.5.0.md) | — | Recording UI |
| 0.6.0 | [PR-0.6.0](pull-requests/PR-0.6.0.md) | — | Upload + storage |
| 0.7.0 | [PR-0.7.0](pull-requests/PR-0.7.0.md) | — | Processing pipeline |
| 0.8.0 | [PR-0.8.0](pull-requests/PR-0.8.0.md) | — | Session status |
| 0.8.1 | [PR-0.8.1](pull-requests/PR-0.8.1.md) | — | Session status fixes |
| 0.8.3 | [PR-0.8.3](pull-requests/PR-0.8.3.md) | — | Session status polish |
| 0.8.4 | [PR-0.8.4](pull-requests/PR-0.8.4.md) | — | Session status fixes |
| 0.9.0 | [PR-0.9.0](pull-requests/PR-0.9.0.md) | 2026-02-28 | Session history + intent labels |
| 0.10.0 | [PR-0.10.0](pull-requests/PR-0.10.0.md) | 2026-02-28 | Federated sign-out |
| 0.11.0 | [PR-0.11.0](pull-requests/PR-0.11.0.md) | 2026-03-05 | Landing page sign-in + cookie consent |
| 0.12.0 | [PR-0.12.0](pull-requests/PR-0.12.0.md) | 2026-03-31 | Landing page sections |
| 0.13.0 | [PR-0.13.0](pull-requests/PR-0.13.0.md) | 2026-03-31 | Polish, rate limiting & production readiness |
| 0.14.0 | [PR-0.14.0](pull-requests/PR-0.14.0.md) | 2026-03-31 | Dashboard data layer + dark mode |
| 0.14.0 | [PR-0.14.1](pull-requests/PR-0.14.1.md) | 2026-03-31 | Dashboard UI |
| 0.15.0 | [PR-0.15.0](pull-requests/PR-0.15.0.md) | 2026-03-31 | Focus-to-session flow |
| 0.16.0 | [PR-0.16.0](pull-requests/PR-0.16.0.md) | 2026-03-31 | Training system backend (drills) |
| 0.17.0 | [PR-0.17.0](pull-requests/PR-0.17.0.md) | 2026-03-31 | Core drills UI |
| 0.18.0 | [PR-0.18.0](pull-requests/PR-0.18.0.md) | 2026-04-01 | Advanced drills, history, dashboard drill stats |
| 0.19.0 | [PR-0.19.0](pull-requests/PR-0.19.0.md) | 2026-04-01 | Production hardening |
| 0.20.0 | [PR-0.20.0](pull-requests/PR-0.20.0.md) | 2026-04-01 | Security hardening |
| 0.21.0 | [PR-0.21.0](pull-requests/PR-0.21.0.md) | 2026-04-01 | Pipeline refactor, CI tests, App Router errors |
| 0.22.0 | [PR-0.22.0](pull-requests/PR-0.22.0.md) | 2026-04-02 | Testing foundation + recording consent on upload |
| 0.23.0 | [PR-0.23.0](pull-requests/PR-0.23.0.md) | 2026-04-02 | UI polish: dark mode, reduced motion, accessibility, smaller client bundle |
| 0.24.0 | [PR-0.24.0](pull-requests/PR-0.24.0.md) | 2026-04-03 | CI/CD pipeline hardening |
| 0.25.0 | [PR-0.25.0](pull-requests/PR-0.25.0.md) | 2026-04-03 | Unit & integration testing coverage |
| 0.26.0 | [PR-0.26.0](pull-requests/PR-0.26.0.md) | 2026-04-03 | E2E + component testing, CI E2E job |
| 0.27.0 | [PR-0.27.0](pull-requests/PR-0.27.0.md) | 2026-04-03 | Test coverage hardening, security headers, DB/CI polish |
| 0.28.0 | [PR-0.28.0](pull-requests/PR-0.28.0.md) | 2026-04-03 | OpenAPI, contributing/deployment/testing docs, ADRs, dev Swagger UI |
| 0.29.0 | [PR-0.29.0](pull-requests/PR-0.29.0.md) | 2026-04-04 | V5 audit remediation: TypeScript safety, perf, security, CI/CD, errors |
| 0.30.0 | [PR-0.30.0](pull-requests/PR-0.30.0.md) | 2026-05-26 | Pronunciation assessment foundation: audio transcoder, Azure client, L1 tagger |
| 0.30.0-beta.1 | [PR-0.30.0-beta.1](pull-requests/PR-0.30.0-beta.1.md) | 2026-05-26 | Pronunciation results UI: score gauges, word map, prosody panel |
| 0.30.0-alpha.2 | [PR-0.30.0-alpha.2](pull-requests/PR-0.30.0-alpha.2.md) | 2026-05-26 | Pipeline pronunciation integration: schema, SCORING status, 9 metric keys, persist layer |
| 0.30.0-rc.1 | [PR-0.30.0-rc.1](pull-requests/PR-0.30.0-rc.1.md) | 2026-05-26 | Dashboard pronunciation metrics + pipeline reliability hardening |
| 0.31.0 | [PR-0.31.0](pull-requests/PR-0.31.0.md) | 2026-05-27 | Whisper hallucination guardrails |
| 0.32.0 | [PR-0.32.0](pull-requests/PR-0.32.0.md) | 2026-05-27 | Pronunciation feedback UX |
| 0.33.0 | [PR-0.33.0](pull-requests/PR-0.33.0.md) | 2026-05-27 | Speaker isolation: push-to-talk, VAD pre-flight, validation gates |
| 0.34.0 | [PR-v0.34.0-ai-analysis-quality](pull-requests/PR-v0.34.0-ai-analysis-quality.md) | 2026-05-27 | AI analysis quality: enriched Claude dimensions + Redis caching |
| 0.35.0 | [ENTRY-39](journal/ENTRY-39.md) | 2026-05-27 | Recording UX: waveform, prompts, time limits, preview flow, mobile polish |
| 0.35.0 | [PR-v0.35.0-recording-ux-flow](pull-requests/PR-v0.35.0-recording-ux-flow.md) | 2026-05-27 | Recording UX & flow — integrated record screen |
| 0.36.0 | [ENTRY-40](journal/ENTRY-40.md) | 2026-05-27 | Recording UX improvements: time limits, background toast, silence pause |
| 0.36.0 | [PR-0.36.0](pull-requests/PR-0.36.0.md) | 2026-05-27 | Extended limits, processing toast, silence auto-pause |
| 0.37.0 | [ENTRY-41](journal/ENTRY-41.md) | 2026-05-27 | L1 bridge rules: 21-tag tagger, articulatory coaching in PhonemeDetail |
| 0.37.0 | [PR-0.37.0](pull-requests/PR-0.37.0.md) | 2026-05-27 | L1 pronunciation bridge rules with client-side coaching lookup |
| 0.38.0 | [ENTRY-42](journal/ENTRY-42.md) | 2026-05-27 | IPA phoneme display, speaking rate fix, break error filter |
| 0.38.0 | [PR-0.38.0](pull-requests/PR-0.38.0.md) | 2026-05-27 | SAPI→IPA toggle, word transcription, ProsodyPanel rounding |
| 0.39.0 | [ENTRY-43](journal/ENTRY-43.md) | 2026-05-27 | No-red color system + ScoreChip coaching labels |
| 0.39.0 | [PR-0.39.0](pull-requests/PR-0.39.0.md) | 2026-05-27 | Coaching palette, ScoreChip in phoneme/metric/prosody UI |
| 0.40.0 | [ENTRY-44](journal/ENTRY-44.md) | 2026-05-27 | Three-pillar dashboard grouping + session hero row |
| 0.40.0 | [PR-0.40.0](pull-requests/PR-0.40.0.md) | 2026-05-27 | PillarCards, strengths-first insights, pillar score tests |
| 0.41.0 | [ENTRY-45](journal/ENTRY-45.md) | 2026-05-27 | Personal records, workout framing, gym-coach copy |
| 0.41.0 | [PR-0.41.0](pull-requests/PR-0.41.0.md) | 2026-05-27 | PR ribbons, workout weeks, workout numbering |
| 0.42.0 | [ENTRY-46](journal/ENTRY-46.md) | 2026-05-27 | Onboarding placement test + paginated session history |
| 0.42.0 | [PR-0.42.0](pull-requests/PR-0.42.0.md) | 2026-05-27 | Onboarding flow, cursor history API, activity feed UI |
| 0.43.0 | [ENTRY-47](journal/ENTRY-47.md) | 2026-05-28 | Settings page, prompt library, history trends |
| 0.43.0 | [PR-0.43.0](pull-requests/PR-0.43.0.md) | 2026-05-28 | Settings page, prompt library, history trends |
| 0.44.0 | [ENTRY-48](journal/ENTRY-48.md) | 2026-05-28 | AI disclosure, transcript pins, today's workout |
| 0.44.0 | [PR-0.44.0](pull-requests/PR-0.44.0.md) | 2026-05-28 | Consent gate, annotated transcript, workout hero card |
| 0.45.0 | [ENTRY-49](journal/ENTRY-49.md) | 2026-05-28 | Chunked recording pipeline — unlimited AudioWorklet capture |
| 0.45.0 | [PR-0.45.0](pull-requests/PR-0.45.0.md) | 2026-05-28 | WAV chunks, parallel processing, fan-in analysis |
| 0.46.0 | [ENTRY-50](journal/ENTRY-50.md) | 2026-05-28 | Observability — Sentry, Pino, health endpoint, CI smoke test |
| 0.46.0 | [PR-0.46.0](pull-requests/PR-0.46.0.md) | 2026-05-28 | Error tracking, structured logging, /api/health |
| 0.47.0 | [ENTRY-51](journal/ENTRY-51.md) | 2026-05-28 | Performance — lazy canvas, Suspense, Cache-Control headers |
| 0.47.0 | [PR-0.47.0](pull-requests/PR-0.47.0.md) | 2026-05-28 | Code splitting, route skeletons, API caching |
| 0.48.0 | [ENTRY-52](journal/ENTRY-52.md) | 2026-05-28 | Accessibility — skip nav, focus rings, aria-live, axe CI |
| 0.48.0 | [PR-0.48.0](pull-requests/PR-0.48.0.md) | 2026-05-28 | Accessibility hardening |
| 0.47.1 | [ENTRY-53](journal/ENTRY-53.md) | 2026-05-30 | Pipeline hardening — fan-in guard, sweeper, chunk failure callback |
| 0.47.1 | [PR-0.47.1](pull-requests/PR-0.47.1.md) | 2026-05-30 | Chunked pipeline reliability + ChunkFeature stub |
| 0.49.0 | [ENTRY-54](journal/ENTRY-54.md) | 2026-05-30 | Pitch contour — parselmouth service, ChunkFeature, SVG viz |
| 0.49.0 | [PR-0.49.0](pull-requests/PR-0.49.0.md) | 2026-05-30 | Pitch contour visualization |
| 0.50.0 | [ENTRY-55](journal/ENTRY-55.md) | 2026-05-31 | Recording UX — fast path, prosody UI, MediaRecorder removal |
| 0.50.0 | [PR-0.50.0](pull-requests/PR-0.50.0.md) | 2026-05-31 | Two-tier recording + progressive results |
| 0.51.0 | [ENTRY-57](journal/ENTRY-57.md) | 2026-05-31 | Parallel chunk pipeline — per-chunk AI, stitch merge, cancel tiers |
| 0.51.0 | [PR-0.51.0](pull-requests/PR-0.51.0.md) | 2026-05-31 | Independent chunk processing + synthesis fan-in |
| 0.52.0 | [ENTRY-58](journal/ENTRY-58.md) | 2026-05-31 | Session results overhaul — collapsible mobile layout |
| 0.53.0 | [ENTRY-59](journal/ENTRY-59.md) | 2026-05-31 | Recording & navigation UX — mobile bottom nav, hero layout |
| 0.52.0 | [PR-0.52.0](pull-requests/PR-0.52.0.md) | 2026-05-31 | Language/pronunciation split, grammar cards, prosody legend |
| 0.53.0 | [PR-0.53.0](pull-requests/PR-0.53.0.md) | 2026-05-31 | Mobile bottom nav, collapsible prompts, hero recording |
| 0.60.1 | [PR-0.60.1](pull-requests/PR-0.60.1.md) | 2026-06-02 | ESLint complexity compliance — zero suppressions, 82 files split into 87 focused modules |
| 0.61.0 | [PR-0.61.0](pull-requests/PR-0.61.0.md) | 2026-06-02 | Pronunciation redesign — functional-load prioritization |
| 0.62.0 | [PR-0.62.0](pull-requests/PR-0.62.0.md) | 2026-06-03 | Daily conclusion engine + language bank system |
| 0.63.0 | [PR-0.63.0](pull-requests/PR-0.63.0.md) | 2026-06-03 | Audit remediation — N+1, VAD, CI split |
| 0.64.0 | [PR-0.64.0](pull-requests/PR-0.64.0.md) | 2026-06-03 | Corpus foundation — models, seed, query layer |
| 0.65.0 | [PR-0.65.0](pull-requests/PR-0.65.0.md) | 2026-06-03 | Corpus-grounded scoring — evidence, hybrid engine, Tier 2 |
| 0.66.0 | [PR-0.66.0](pull-requests/PR-0.66.0.md) | 2026-06-03 | Verbatim ASR — AssemblyAI integration, dual-transcript divergence |
| 0.67.0 | [ENTRY-74](journal/ENTRY-74.md) | 2026-06-03 | Grammar pipeline — divergence classification, evidence-based verbAccuracy |
| 0.67.0 | [PR-0.67.0](pull-requests/PR-0.67.0.md) | 2026-06-03 | Grammar pipeline, argumentClosure → Language, GrammarSection UI |
| 0.72.0 | [PR-0.72.0](pull-requests/PR-0.72.0.md) | 2026-06-12 | Dependency security — patched test-runner CVEs, removed unfixable xlsx |
| 0.72.1 | [PR-0.72.1](pull-requests/PR-0.72.1.md) | 2026-06-12 | Type safety cleanup — removed unsafe casts and non-null assertions |
| 0.72.2 | [ENTRY-81](journal/ENTRY-81.md) | 2026-06-12 | Architecture boundary cleanup — eliminated lib→features dependency inversions |
| 0.72.2 | [PR-0.72.2](pull-requests/PR-0.72.2.md) | 2026-06-12 | Moved metric types/pillar constants + updatePatternProfile to lib; decoupled withObservability from auth |
| 0.72.3 | [ENTRY-82](journal/ENTRY-82.md) | 2026-06-12 | Code complexity — split four files at/over the 300-line limit |
| 0.72.3 | [PR-0.72.3](pull-requests/PR-0.72.3.md) | 2026-06-12 | Extracted persistAnalysis, azureSdkMappers, PronunciationMap, FilmGrain |
| 0.72.4 | [ENTRY-83](journal/ENTRY-83.md) | 2026-06-12 | Dev toolchain hardening — happy-dom 17→20, full-tree critical CI gate, gitleaks |
| 0.72.4 | [PR-0.72.4](pull-requests/PR-0.72.4.md) | 2026-06-12 | happy-dom CVE fix + CI critical audit + secret scanning + pinned typecheck |
