# Learning Speaking App

[![CI](https://github.com/manumu-studio/learning-speaking-app/actions/workflows/ci.yml/badge.svg)](https://github.com/manumu-studio/learning-speaking-app/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/manumu-studio/learning-speaking-app/branch/main/graph/badge.svg)](https://codecov.io/gh/manumu-studio/learning-speaking-app)

AI-powered English speaking coach that provides real-time feedback on spoken language patterns. Record yourself speaking, get dual transcription (OpenAI Whisper for the display transcript; AssemblyAI for a verbatim copy that surfaces grammar errors and disfluency patterns) and analysis powered by Claude, and track your improvement over time.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Neon serverless) via Prisma ORM
- **Auth:** OIDC + PKCE (external auth server, RS256 JWT)
- **Storage:** Cloudflare R2 (temporary audio)
- **AI Pipeline:** OpenAI Whisper (display transcript) + AssemblyAI Universal-3-Pro (verbatim transcript, parallel) → Speaker filtering (coach speech removal) → Levenshtein divergence detection → Corpus lookup (frequency, CEFR, collocations) → Azure Speech (pronunciation assessment) → Claude Haiku (dual-transcript synthesis with source routing) → Deterministic overrides (filler count from verbatim, speaking rate from Azure) → Hybrid scoring (corpus confirms/overrides LLM) → Grammar classification (divergence spans classified as errors/self-corrections/artifacts)
- **Pronunciation:** Azure Speech SDK (phoneme accuracy, prosody, speaking rate, L1 interference detection)
- **Queue:** QStash (async processing with retry, parallel per-chunk pipeline)
- **Hosting:** Vercel

## Architecture

```
Browser (AudioWorklet) → 2-min chunks with 5s overlap → Upload each to R2
                                                            ↓
                                              Per-chunk pipeline (parallel via QStash):
                                              1. Download chunk from R2
                                              2. Whisper → transcript
                                              3. Azure Speech → pronunciation + prosody
                                              4. Claude Haiku → per-chunk insights
                                              5. Delete chunk audio from R2
                                                            ↓
                                              Fan-in on session complete:
                                              1. Stitch transcripts (overlap dedup via LCS)
                                              2. Merge pronunciation scores (weighted avg)
                                              3. Stitch verbatim → speaker filter → divergence
                                              4. Claude synthesis (dual-transcript, source-routed)
                                              5. Deterministic overrides (filler count, speaking rate)
                                              6. Grammar classification + naturalness detection
                                              7. Store in Postgres
                                                            ↓
Browser (Results UI) ← Progressive results during recording ← Next.js API
        ↓
Dashboard ← 11 metrics across 3 pillars (Delivery: 2, Language: 7, Pronunciation: 2), sparklines, streak, CEFR level, skill radar
        ↓
Training Gym ← AI-generated drills per metric → record response → evaluate
        ↓
Fluency Training ← 4-3-2 timed rounds (same topic, decreasing time) → WPM comparison
        ↓
Intelligence ← Phoneme patterns + vocab SRS (suggest → detect adoption → spaced review) + collocations + reading practice
```

## How It Works

1. **Record** — AudioWorklet captures PCM audio, automatically splitting into 2-minute chunks with 5-second overlap for seamless stitching
2. **Upload** — Each chunk uploads to R2 via presigned URL while recording continues; progressive results appear as chunks complete
3. **Process** — QStash triggers parallel per-chunk pipelines (Whisper transcription + AssemblyAI verbatim + Azure pronunciation assessment + Claude analysis), then a fan-in pass stitches transcripts, filters coach speech from verbatim, runs source-routed synthesis (Whisper for vocabulary/structure, verbatim for register/naturalness), applies deterministic overrides (filler count, speaking rate), and runs grammar classification
4. **Results** — Eleven scored dimensions across 3 pillars: Delivery (filler usage from verbatim count, speaking rate from Azure timings), Language (connector repetition, structural variety, vocabulary precision, verb accuracy, argument closure, lexical sophistication, register & pragmatics), and Pronunciation (accuracy, prosody). Each metric is scored from its correct source — deterministic counts for fillers, Azure timings for speaking rate, verbatim transcript for register/naturalness, Whisper transcript for vocabulary/structure. Vocabulary and naturalness scores are corpus-grounded — word frequency, CEFR levels, and collocation attestation from 140k+ academic reference rows inform Claude's scoring, and a hybrid decision rule can confirm or override LLM judgments. Includes a functional-load-ranked Priority Sounds list, a 3-band word-level Pronunciation Accuracy map, IPA phoneme detail, prosody feedback, L1 interference coaching, register/pragmatics feedback with hedging suggestions, and naturalness detection (flags formulaic phrases and suggests native-sounding alternatives with corpus-backed confidence tiers)
5. **Dashboard** — Metric trends with sparklines, streak tracking, personal records, CEFR level estimation badge with longitudinal sparkline, 10-axis skill radar chart with C2 threshold overlay, and recent session history
6. **Training** — AI-generated drills targeting weak metrics; user records a response, evaluated via heuristic + AI scoring
7. **Fluency Training** — 4-3-2 Timed Fluency exercise: repeat the same topic across 3 rounds (4→3→2 minutes) to build automaticity. Countdown timer with grace period, 3-round WPM comparison with SVG bar charts, and session history with progression tracking
8. **Intelligence** — Phoneme pattern analysis surfaces your top 5 weakest sounds with IPA symbols; vocabulary tracker persists Claude's word suggestions, detects when you use them in future sessions, and schedules them for spaced review (SM-2) with a tabbed review-queue page; collocation detection flags multi-word phrases worth learning; vocab-enhanced transcript rewrites your speech with suggested words woven in (toggle between "Your words" and "Improved"); Reading Practice generates text targeting your weak sounds
9. **Daily Conclusion** — The current day stays open until the 10pm local cutoff so live sessions remain visible. Closed days use a daily meta-session read model that combines completed sessions into Sessions, Speech Quality, Pronunciation & Intonation, General Feedback, and Transcript sections. The cached AI conclusion provides the topic sentence and coaching narrative while the detail view stays grounded in scoped session data
10. **Evidence Logs** — Every score and insight traces back to real DB data. The Logs page (`/logs/session/[id]`, `/logs/day/[date]`) shows the evidence register: metric snapshots, transcript spans, grammar flags, pronunciation scores, naturalness flags, corpus matches, and pipeline metadata — with source system attribution (Whisper, AssemblyAI, Azure, Claude, corpus, grammar pipeline)
11. **Privacy** — Audio is deleted from R2 immediately after processing; no audio is retained
12. **Eval Pipeline** — An offline accuracy harness for the seven LLM-judged language metrics. A frozen, human-labelled golden set is replayed through the judge (the analysis cache can be bypassed so a prompt change produces a fresh score), and a stats module reports per-metric MAE, within-1%, Spearman correlation, and banded QWK — each shown with a bootstrap 95% confidence interval and the rater's intra-rater ceiling. Results are written to `eval/REPORT-latest.json` and viewable at `/dev/evals`, where any metric whose error exceeds the intra-rater ceiling is flagged, alongside an explicit caveat about sample size and single-rater limitations. The judge run is driven by Promptfoo; the statistics are graded in Vitest

## Documentation

- [Changelog](CHANGELOG.md) — Version history (76 releases)
- [Architecture](docs/architecture/SYSTEM_DIAGRAM.md) — System diagrams and data flow
- [System Spec](docs/architecture/SYSTEM_SPEC.md) — Detailed behaviour and constraints
- [Deployment](docs/DEPLOYMENT.md) — Production deployment and troubleshooting
- [Contributing](CONTRIBUTING.md) — Setup, workflow, and code standards
- [Testing](docs/TESTING.md) — Test strategy and commands
- [Security](docs/SECURITY.md) — Privacy and security practices
- [Decisions](docs/decisions/) — Architecture Decision Records (6 ADRs)
- **API Reference** — Interactive Swagger UI at [`/api/docs`](http://localhost:3000/api/docs) (development only). Raw OpenAPI 3.1 JSON at `/api/docs/spec`. Static spec: [`docs/api/openapi.yaml`](docs/api/openapi.yaml)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- Cloudflare R2 bucket
- OpenAI API key
- Anthropic API key
- Azure Speech key + region (pronunciation assessment)
- QStash token ([Upstash](https://upstash.com))

### Setup

```bash
git clone https://github.com/manumu-studio/learning-speaking-app.git
cd learning-speaking-app
npm install
cp .env.example .env.local  # Fill in your credentials
npx prisma migrate deploy
npm run dev
```

### Environment Variables

See `.env.example` for the full list of required environment variables.

### Tests

Run unit and component tests (Vitest): `npm run test`. Coverage: `npm run test:coverage`.

End-to-end tests (Playwright, Chromium): `npm run test:e2e` — requires Node 20+ and a working dev toolchain (`npm run dev` must start; the runner can start it automatically). UI mode: `npm run test:e2e:ui`.

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── (app)/        # Authenticated app routes (dashboard, session, drills, history, fluency-training, logs)
│   ├── (public)/     # Public routes (landing, launch)
│   └── api/          # API endpoints (sessions, drills, dashboard, fluency-sessions, pipeline, auth, docs)
├── components/ui/    # Reusable UI components (30+ components)
├── features/         # Feature modules
│   ├── auth/         # Authentication hooks and helpers
│   ├── dashboard/    # Dashboard data fetching, metric cards, CEFR badge, skill radar, types
│   ├── eval/         # Eval report table (EvalReportTable)
│   ├── insights/     # Session insight display
│   ├── fluency/      # 4-3-2 timed fluency training (TimedRecording, FluencyComparison, FluencySessionList)
│   ├── prompts/      # Prompt library UI (60+ prompts, multi-filter, format badges)
│   ├── recording/    # Audio recording and upload
│   ├── history/      # Daily conclusion card, day detail meta-session view
│   ├── logs/         # Evidence register UI (session and day evidence tables)
│   ├── session/      # Session status polling, display, register/pragmatics feedback, naturalness
│   ├── training/     # Drill generation, evaluation, drill UI, reading practice
│   └── vocabulary/   # Vocabulary SRS review queue, collocations, stats UI
├── lib/              # Shared utilities (AI, analysis, analysis/divergence, analysis/grammar, assemblyai, auth, CEFR, corpus, eval, evidence, prompts, queue, storage, pipeline, pronunciation, srs, logger, naturalness, daily/dayDetail)
├── config/           # App configuration
└── middleware.ts     # JWT validation + route protection + CSP headers
docs/
├── architecture/     # System spec and diagrams
├── decisions/        # Architecture Decision Records (ADRs)
├── eval/             # Eval rubrics and methodology
└── roadmap/          # Development roadmap
prisma/
├── schema.prisma     # Database schema
└── migrations/       # Prisma migrations
scripts/
└── eval/             # Eval tooling — snapshot, label, run, and report scripts
eval/
├── promptfooconfig.yaml  # Eval runner config + custom judge provider
└── REPORT-latest.json    # Generated per-metric accuracy report (gitignored)
```

## License

Private — All rights reserved.
