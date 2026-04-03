# Learning Speaking App

AI-powered English speaking coach that provides real-time feedback on spoken language patterns. Record yourself speaking, get transcription and analysis powered by OpenAI Whisper and Claude, and track your improvement over time.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Neon serverless) via Prisma ORM
- **Auth:** OIDC + PKCE (external auth server, RS256 JWT)
- **Storage:** Cloudflare R2 (temporary audio)
- **AI Pipeline:** OpenAI Whisper (transcription) → Claude Haiku (analysis)
- **Queue:** QStash (async processing with retry)
- **Hosting:** Vercel

## Architecture

```
Browser (Record UI) → Upload audio → R2 (temp storage)
                                        ↓
                              QStash triggers pipeline:
                              1. Download from R2
                              2. Whisper → transcript
                              3. Claude Haiku → insights + 6 metric scores
                              4. Store in Postgres (session, insights, MetricSnapshot)
                              5. Delete audio from R2
                                        ↓
Browser (Results UI) ← Poll status ← Next.js API
        ↓
Dashboard ← Metric trends, sparklines, streak, recent activity
        ↓
Training Gym ← AI-generated drills per metric → record response → evaluate
```

## How It Works

1. **Record** — User records speech via browser MediaRecorder API
2. **Upload** — Audio is uploaded to Cloudflare R2 via presigned URL
3. **Process** — QStash triggers an async pipeline that transcribes (Whisper) and analyzes (Claude) the recording
4. **Results** — User sees six scored dimensions (connector repetition, structural variety, vocabulary precision, verb accuracy, argument closure, filler usage), a summary, and a next-step recommendation
5. **Dashboard** — Metric trends with sparklines, streak tracking, and recent session history
6. **Training** — AI-generated drills targeting weak metrics; user records a response, evaluated via heuristic + AI scoring
7. **Privacy** — Audio is deleted from R2 immediately after transcription

## Documentation

- [API Reference](docs/api/openapi.yaml) — OpenAPI 3.1 spec (with `npm run dev`, open `/api/docs` for Swagger UI)
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
├── components/ui/    # Reusable UI components (25+ components)
├── features/         # Feature modules
│   ├── auth/         # Authentication hooks and helpers
│   ├── dashboard/    # Dashboard data fetching, metric cards, types
│   ├── insights/     # Session insight display
│   ├── recording/    # Audio recording and upload
│   ├── session/      # Session status polling and display
│   └── training/     # Drill generation, evaluation, and drill UI
├── lib/              # Shared utilities (AI, auth, queue, storage, pipeline, logger)
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
