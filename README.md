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
Dashboard ← 9 metrics (6 language + 3 pronunciation), sparklines, streak
        ↓
Training Gym ← AI-generated drills per metric → record response → evaluate
        ↓
Intelligence ← Phoneme patterns + vocab tracking (suggest → detect adoption) + reading practice
```

## How It Works

1. **Record** — AudioWorklet captures PCM audio, automatically splitting into 2-minute chunks with 5-second overlap for seamless stitching
2. **Upload** — Each chunk uploads to R2 via presigned URL while recording continues; progressive results appear as chunks complete
3. **Process** — QStash triggers parallel per-chunk pipelines (Whisper transcription + Azure pronunciation assessment + Claude analysis), then a fan-in synthesis pass deduplicates and merges insights across the full session
4. **Results** — Nine scored dimensions: 6 language metrics (connector repetition, structural variety, vocabulary precision, verb accuracy, argument closure, filler usage) + 3 pronunciation metrics (accuracy, prosody, speaking rate). Includes word-level pronunciation color map, IPA phoneme detail, prosody feedback, and L1 interference coaching
5. **Dashboard** — Metric trends with sparklines, streak tracking, personal records, and recent session history
6. **Training** — AI-generated drills targeting weak metrics; user records a response, evaluated via heuristic + AI scoring
7. **Intelligence** — Phoneme pattern analysis surfaces your top 5 weakest sounds with IPA symbols; vocabulary tracker persists Claude's word suggestions and detects when you use them in future sessions; vocab-enhanced transcript rewrites your speech with suggested words woven in (toggle between "Your words" and "Improved"); Reading Practice generates text targeting your weak sounds
8. **Privacy** — Audio is deleted from R2 immediately after processing; no audio is retained

## Documentation

- [API Reference](docs/api/openapi.yaml) — OpenAPI 3.1 spec — API documentation available at `/api/docs` in development mode (Swagger UI)
- [Architecture](docs/architecture/SYSTEM_DIAGRAM.md) — System diagrams and data flow
- [Contributing](CONTRIBUTING.md) — Setup, workflow, and code standards
- [Testing](docs/TESTING.md) — Test strategy and commands
- [Deployment](docs/DEPLOYMENT.md) — Production deployment and troubleshooting
- [Decisions](docs/decisions/) — Architecture Decision Records
- [Security](docs/SECURITY.md) — Privacy and security practices
- [System spec](docs/architecture/SYSTEM_SPEC.md) — Detailed behaviour and constraints

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
│   ├── (app)/        # Authenticated app routes (dashboard, session, drills, history)
│   ├── (public)/     # Public routes (landing, launch)
│   └── api/          # API endpoints (sessions, drills, dashboard, pipeline, auth, docs)
├── components/ui/    # Reusable UI components (30+ components)
├── features/         # Feature modules
│   ├── auth/         # Authentication hooks and helpers
│   ├── dashboard/    # Dashboard data fetching, metric cards, types
│   ├── insights/     # Session insight display
│   ├── recording/    # Audio recording and upload
│   ├── session/      # Session status polling and display
│   └── training/     # Drill generation, evaluation, drill UI, reading practice
├── lib/              # Shared utilities (AI, auth, queue, storage, pipeline, pronunciation, logger)
├── config/           # App configuration
└── middleware.ts     # JWT validation + route protection + CSP headers
docs/
├── api/              # OpenAPI 3.1 spec
├── architecture/     # System spec and diagrams
├── decisions/        # Architecture Decision Records (ADRs)
└── roadmap/          # Development roadmap
prisma/
├── schema.prisma     # Database schema
└── migrations/       # Prisma migrations
```

## License

Private — All rights reserved.
