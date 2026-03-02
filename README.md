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
                              3. Claude → insights
                              4. Store in Postgres
                              5. Delete audio from R2
                                        ↓
Browser (Results UI) ← Poll status ← Next.js API
```

## How It Works

1. **Record** — User records speech via browser MediaRecorder API
2. **Upload** — Audio is uploaded to Cloudflare R2 via presigned URL
3. **Process** — QStash triggers an async pipeline that transcribes (Whisper) and analyzes (Claude) the recording
4. **Results** — User sees categorized insights (grammar, vocabulary, fluency, pronunciation, pragmatics), a summary, and a focused next-step recommendation
5. **Privacy** — Audio is deleted from R2 immediately after transcription

## Recent Updates

- **Landing auth simplification:** Sign-in now starts directly on `/` (no intermediate `/auth/signin` page).
- **Cookie consent banner:** First-visit consent notice is shown on landing page and persisted in local storage.
- **Federated sign-out support:** Sign-out now clears local session and logs out from the external auth provider.

## Getting Started

### Prerequisites

- Node.js 18+
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
npx prisma db push
npm run dev
```

### Environment Variables

See `.env.example` for the full list of required environment variables.

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── (app)/        # Authenticated app routes
│   ├── (public)/     # Public routes
│   └── api/          # API endpoints (sessions, pipeline, dev tools)
├── components/ui/    # Reusable UI components
├── features/         # Feature modules (recording, session)
├── lib/              # Shared utilities (AI clients, auth, queue, storage)
├── config/           # App configuration
└── middleware.ts     # JWT validation + route protection
docs/
├── architecture/     # System specification
└── roadmap/          # Development roadmap
prisma/
└── schema.prisma     # Database schema
```

## License

Private — All rights reserved.
