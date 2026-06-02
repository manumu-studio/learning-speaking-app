# Learning Speaking App

[![CI](https://github.com/manumu-studio/learning-speaking-app/actions/workflows/ci.yml/badge.svg)](https://github.com/manumu-studio/learning-speaking-app/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/manumu-studio/learning-speaking-app/branch/main/graph/badge.svg)](https://codecov.io/gh/manumu-studio/learning-speaking-app)

AI-powered English speaking coach that provides real-time feedback on spoken language patterns. Record yourself speaking, get transcription and analysis powered by OpenAI Whisper and Claude, and track your improvement over time.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Neon serverless) via Prisma ORM
- **Auth:** OIDC + PKCE (external auth server, RS256 JWT)
- **Storage:** Cloudflare R2 (temporary audio)
- **AI Pipeline:** OpenAI Whisper (transcription) → Azure Speech (pronunciation assessment) → Claude Haiku (analysis + synthesis)
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
                                              3. Claude synthesis → deduplicated session insights
                                              4. Store in Postgres
                                                            ↓
Browser (Results UI) ← Progressive results during recording ← Next.js API
        ↓
Dashboard ← 11 metrics (8 language + 3 pronunciation), sparklines, streak, CEFR level, skill radar
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
3. **Process** — QStash triggers parallel per-chunk pipelines (Whisper transcription + Azure pronunciation assessment + Claude analysis), then a fan-in synthesis pass deduplicates and merges insights across the full session
4. **Results** — Eleven scored dimensions: 8 language metrics (connector repetition, structural variety, vocabulary precision, verb accuracy, argument closure, filler usage, lexical sophistication, register & pragmatics) + 3 pronunciation metrics (accuracy, prosody, speaking rate). Includes word-level pronunciation color map, IPA phoneme detail, prosody feedback, L1 interference coaching, and register/pragmatics feedback with hedging suggestions
5. **Dashboard** — Metric trends with sparklines, streak tracking, personal records, CEFR level estimation badge with longitudinal sparkline, 10-axis skill radar chart with C2 threshold overlay, and recent session history
6. **Training** — AI-generated drills targeting weak metrics; user records a response, evaluated via heuristic + AI scoring
7. **Fluency Training** — 4-3-2 Timed Fluency exercise: repeat the same topic across 3 rounds (4→3→2 minutes) to build automaticity. Countdown timer with grace period, 3-round WPM comparison with SVG bar charts, and session history with progression tracking
8. **Intelligence** — Phoneme pattern analysis surfaces your top 5 weakest sounds with IPA symbols; vocabulary tracker persists Claude's word suggestions, detects when you use them in future sessions, and schedules them for spaced review (SM-2) with a tabbed review-queue page; collocation detection flags multi-word phrases worth learning; vocab-enhanced transcript rewrites your speech with suggested words woven in (toggle between "Your words" and "Improved"); Reading Practice generates text targeting your weak sounds
9. **Privacy** — Audio is deleted from R2 immediately after processing; no audio is retained

## Documentation

- [Changelog](CHANGELOG.md) — Version history (67 releases)
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
│   ├── (app)/        # Authenticated app routes (dashboard, session, drills, history, fluency-training)
│   ├── (public)/     # Public routes (landing, launch)
│   └── api/          # API endpoints (sessions, drills, dashboard, fluency-sessions, pipeline, auth, docs)
├── components/ui/    # Reusable UI components (30+ components)
├── features/         # Feature modules
│   ├── auth/         # Authentication hooks and helpers
│   ├── dashboard/    # Dashboard data fetching, metric cards, CEFR badge, skill radar, types
│   ├── insights/     # Session insight display
│   ├── fluency/      # 4-3-2 timed fluency training (TimedRecording, FluencyComparison, FluencySessionList)
│   ├── prompts/      # Prompt library UI (60+ prompts, multi-filter, format badges)
│   ├── recording/    # Audio recording and upload
│   ├── session/      # Session status polling, display, register/pragmatics feedback
│   ├── training/     # Drill generation, evaluation, drill UI, reading practice
│   └── vocabulary/   # Vocabulary SRS review queue, collocations, stats UI
├── lib/              # Shared utilities (AI, auth, CEFR, prompts, queue, storage, pipeline, pronunciation, srs, logger)
├── config/           # App configuration
└── middleware.ts     # JWT validation + route protection + CSP headers
docs/
├── architecture/     # System spec and diagrams
├── decisions/        # Architecture Decision Records (ADRs)
└── roadmap/          # Development roadmap
prisma/
├── schema.prisma     # Database schema
└── migrations/       # Prisma migrations
```

## License

Private — All rights reserved.
