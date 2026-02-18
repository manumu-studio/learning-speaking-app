# Learning Speaking App — System Specification

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER                                │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ Record UI │  │ Results  │  │ Auth (PKCE redirect)   │ │
│  │MediaRecorder│ │ Display │  │ → auth.manumustudio.com│ │
│  └─────┬─────┘  └────▲────┘  └────────────────────────┘ │
└────────┼──────────────┼──────────────────────────────────┘
         │ upload       │ poll
         ▼              │
┌────────────────────────────────────────────────────────────┐
│        NEXT.JS 15  (speak.manumustudio.com)                │
│                                                            │
│  API Routes (/api/sessions, /api/profile, /api/internal)   │
│  Middleware (JWT validation via JWKS)                       │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Async Pipeline (triggered via QStash)              │   │
│  │  1. Download audio from R2                          │   │
│  │  2. Send to Whisper API → transcript                │   │
│  │  3. Send transcript to Claude Haiku → insights      │   │
│  │  4. Store results in Postgres                       │   │
│  │  5. Delete audio from R2                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  Postgres (Neon)  ←→  Prisma ORM                           │
│  R2 (temp audio)                                           │
└────────────────────────────────────────────────────────────┘
         │
         │ OIDC Authorization Code + PKCE
         ▼
┌─────────────────────────────────┐
│  auth.manumustudio.com          │
│  RS256 JWT · JWKS · OIDC        │
│  Discovery endpoint available   │
└─────────────────────────────────┘
```

## Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | Same ecosystem as auth service |
| Language | TypeScript (strict) | End-to-end type safety |
| Styling | Tailwind CSS | Rapid UI, no runtime cost |
| Auth | next-auth v5 + custom OIDC provider | Leverages existing auth service |
| DB | Neon Postgres + Prisma | Serverless, proven |
| STT | OpenAI Whisper API | Best price/quality (~$0.006/min) |
| Analysis | Claude Haiku 4.5 | Cheapest model for pattern detection |
| Queue | Upstash QStash | HTTP-based, serverless, auto-retry |
| Temp storage | Cloudflare R2 | Free egress, lifecycle auto-delete |
| Deploy | Vercel | Seamless Next.js hosting |

## Auth Integration

### Protocol
- **Authorization Code Flow + PKCE (S256)**
- Auth service supports: OIDC Discovery, JWKS, RS256 tokens

### Implementation (next-auth v5)
```typescript
// src/features/auth/auth.ts
import NextAuth from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [{
    id: "manumustudio",
    name: "ManuMuStudio",
    type: "oidc",
    issuer: "https://auth.manumustudio.com",
    clientId: env.AUTH_CLIENT_ID,
    clientSecret: env.AUTH_CLIENT_SECRET,
    checks: ["pkce", "state"],
  }],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.sub) token.externalId = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.externalId) session.user.externalId = token.externalId;
      return session;
    },
  },
});
```

### Security Rules
- Always PKCE (S256), never implicit flow
- Client secret only server-side
- Validate `iss` and `aud` claims (automatic with next-auth OIDC)
- No refresh tokens in MVP — re-auth on expiry

### Prerequisite
- Register OAuth client on auth.manumustudio.com
- Auth service needs `/userinfo` endpoint (separate task)

## Data Model (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SessionStatus {
  CREATED
  UPLOADED
  TRANSCRIBING
  ANALYZING
  DONE
  FAILED
}

enum ConsentFlag {
  AUDIO_STORAGE
  TRANSCRIPT_STORAGE
  PATTERN_TRACKING
}

model User {
  id             String           @id @default(cuid())
  externalId     String           @unique
  email          String?
  displayName    String?
  sessions       SpeakingSession[]
  consents       UserConsent[]
  patternProfile PatternProfile?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  @@map("users")
}

model UserConsent {
  id        String      @id @default(cuid())
  userId    String
  flag      ConsentFlag
  granted   Boolean
  grantedAt DateTime    @default(now())
  revokedAt DateTime?
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, flag])
  @@map("user_consents")
}

model SpeakingSession {
  id             String        @id @default(cuid())
  userId         String
  status         SessionStatus @default(CREATED)
  durationSecs   Int?
  language       String        @default("en")
  topic          String?
  promptUsed     String?
  audioUrl       String?
  audioDeletedAt DateTime?
  errorMessage   String?
  focusNext      String?       @db.Text
  transcript     Transcript?
  insights       Insight[]
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  @@index([userId, createdAt])
  @@map("speaking_sessions")
}

model Transcript {
  id        String          @id @default(cuid())
  sessionId String          @unique
  text      String          @db.Text
  wordCount Int?
  session   SpeakingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@map("transcripts")
}

model Insight {
  id         String          @id @default(cuid())
  sessionId  String
  category   String
  pattern    String
  detail     String          @db.Text
  frequency  Int?
  severity   String?
  examples   Json?
  suggestion String?         @db.Text
  session    SpeakingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@index([sessionId])
  @@map("insights")
}

model PatternProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  patterns    Json
  focusAreas  Json?
  lastUpdated DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("pattern_profiles")
}
```

## API Design

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/sessions | Yes | Create session + upload audio |
| GET | /api/sessions | Yes | List sessions (paginated) |
| GET | /api/sessions/:id | Yes | Session status + results |
| DELETE | /api/sessions/:id | Yes | Delete session + data |
| GET | /api/profile | Yes | User profile + consents |
| PUT | /api/profile/consents | Yes | Update consent flags |
| GET | /api/profile/export | Yes | GDPR data export |
| POST | /api/internal/process | QStash sig | Pipeline webhook |

### State Machine
```
CREATED → UPLOADED → TRANSCRIBING → ANALYZING → DONE
                                              → FAILED
```

### Error Response Shape
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

## Processing Pipeline

```
1. UPLOAD (API route)
   ├── Validate: ≤50MB, audio/*
   ├── Stream → R2 temp bucket
   ├── Create session (UPLOADED)
   ├── Enqueue QStash → /api/internal/process
   └── Return session ID

2. TRANSCRIBE (webhook)
   ├── Download from R2
   ├── Status → TRANSCRIBING
   ├── Whisper API → transcript
   ├── Store transcript
   └── Delete audio from R2

3. ANALYZE (same handler)
   ├── Status → ANALYZING
   ├── Claude Haiku + structured prompt
   ├── Zod-validate JSON response
   ├── Store insights + focusNext
   ├── Update PatternProfile
   └── Status → DONE

4. ERROR
   ├── Catch → status = FAILED + errorMessage
   ├── QStash retries 3x exponential
   └── After 3 fails → stays FAILED
```

## Environment Variables

```env
DATABASE_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
APP_URL=
NODE_ENV=
```

## Privacy Requirements

1. Record only on explicit user action
2. Audio deleted immediately after transcription
3. Transcripts are PII — scope all queries to userId
4. No teacher access to individual sessions
5. GDPR: delete cascades all data, export returns JSON
6. Consent flags before first session
7. Never log transcript content

## Cost Per Session

| Service | Cost |
|---------|------|
| Whisper (10 min) | ~$0.06 |
| Claude Haiku | ~$0.003 |
| R2 + DB | ~$0.00 |
| **Total** | **~$0.063** |

## Future: Personalization

Data already captured to enable this:
- `PatternProfile.patterns` — aggregated frequencies
- `Insight` records — per-session, linkable over time
- Session history with timestamps

**v1.1**: Aggregate trends + context-aware LLM feedback
**v2**: pgvector embeddings + RAG memory + learning plans
