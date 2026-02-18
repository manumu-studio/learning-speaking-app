# PACKET-02 — Database Schema

**Branch:** `feature/database-schema`
**Version:** `0.2.0`
**Prerequisites:** PACKET-01 completed successfully

---

## Overview

Set up the complete database schema for the Learning Speaking App using Prisma with PostgreSQL. This includes user management, session tracking, transcripts, insights, and user pattern profiles.

---

## What to Build

### 1. Write the Full Prisma Schema

Replace the contents of `prisma/schema.prisma` with:

```prisma
// Complete database schema for Learning Speaking App
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

---

### 2. Create TypeScript Type Definitions

Create `src/features/session/session.types.ts`:

```typescript
// Type definitions for speaking sessions and related entities
import type {
  User,
  UserConsent,
  SpeakingSession,
  Transcript,
  Insight,
  PatternProfile,
  SessionStatus as PrismaSessionStatus,
  ConsentFlag as PrismaConsentFlag
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  UserConsent,
  SpeakingSession,
  Transcript,
  Insight,
  PatternProfile
};

// Union types for enums (use these outside Prisma)
export type SessionStatus =
  | 'CREATED'
  | 'UPLOADED'
  | 'TRANSCRIBING'
  | 'ANALYZING'
  | 'DONE'
  | 'FAILED';

export type ConsentFlag =
  | 'AUDIO_STORAGE'
  | 'TRANSCRIPT_STORAGE'
  | 'PATTERN_TRACKING';

export type InsightCategory =
  | 'grammar'
  | 'vocabulary'
  | 'structure'
  | 'pronunciation'
  | 'fluency'
  | 'coherence';

export type InsightSeverity =
  | 'high'
  | 'medium'
  | 'low';

// Composite types with relations
export type SpeakingSessionWithTranscript = SpeakingSession & {
  transcript: Transcript | null;
};

export type SpeakingSessionWithInsights = SpeakingSession & {
  insights: Insight[];
};

export type SpeakingSessionComplete = SpeakingSession & {
  transcript: Transcript | null;
  insights: Insight[];
  user: User;
};

export type UserWithProfile = User & {
  patternProfile: PatternProfile | null;
};

// Input types for creating/updating
export type CreateSessionInput = {
  userId: string;
  language?: string;
  topic?: string;
  promptUsed?: string;
};

export type UpdateSessionInput = {
  status?: SessionStatus;
  durationSecs?: number;
  audioUrl?: string;
  errorMessage?: string;
  focusNext?: string;
};

export type CreateInsightInput = {
  sessionId: string;
  category: InsightCategory;
  pattern: string;
  detail: string;
  frequency?: number;
  severity?: InsightSeverity;
  examples?: unknown;
  suggestion?: string;
};
```

---

### 3. Generate Prisma Client

Run the following command to generate the Prisma client:

```bash
npx prisma generate
```

This will create the `@prisma/client` package with TypeScript types based on your schema.

---

### 4. Push Schema to Database

**Option A: For rapid prototyping (recommended for development):**

```bash
npx prisma db push
```

**Option B: For production-ready migrations:**

```bash
npx prisma migrate dev --name init
```

**Important:** You must have a valid `DATABASE_URL` in `.env.local` before running this command.

Example `.env.local`:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/learning_speaking_app?schema=public"
```

For Neon PostgreSQL, the URL format is:

```bash
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/learning_speaking_app?sslmode=require"
```

---

### 5. Create Seed File Structure

Create `prisma/seed.ts`:

```typescript
// Database seed script for development and testing
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Starting database seed...');

  // No seed data needed for MVP
  // Add seed data here when needed for development/testing

  console.log('Seed complete (no seed data for MVP)');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

### 6. Configure Seed Script in package.json

Add the following to your `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "npx prisma db seed",
    "db:push": "npx prisma db push",
    "db:studio": "npx prisma studio"
  }
}
```

Ensure `ts-node` is installed:

```bash
npm install -D ts-node
```

---

### 7. Create Database Utility Functions

Create `src/lib/db-utils.ts`:

```typescript
// Database utility functions for common operations
import { prisma } from './prisma';
import type { User, SpeakingSession } from '@prisma/client';

/**
 * Find or create a user by external ID (from OAuth provider)
 */
export async function findOrCreateUser(
  externalId: string,
  data: { email?: string; displayName?: string }
): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { externalId },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      externalId,
      email: data.email,
      displayName: data.displayName,
    },
  });
}

/**
 * Get user's recent sessions with pagination
 */
export async function getUserSessions(
  userId: string,
  limit = 10,
  offset = 0
): Promise<SpeakingSession[]> {
  return prisma.speakingSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      transcript: true,
      insights: true,
    },
  });
}

/**
 * Check if user has granted a specific consent
 */
export async function hasConsent(
  userId: string,
  flag: 'AUDIO_STORAGE' | 'TRANSCRIPT_STORAGE' | 'PATTERN_TRACKING'
): Promise<boolean> {
  const consent = await prisma.userConsent.findUnique({
    where: {
      userId_flag: { userId, flag },
    },
  });

  return consent?.granted === true && consent.revokedAt === null;
}
```

---

### 8. Test Database Connection

Create `src/lib/__tests__/prisma.test.ts` (optional, for validation):

```typescript
// Basic database connection test
import { prisma } from '../prisma';

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');

    const userCount = await prisma.user.count();
    console.log(`✅ Current user count: ${userCount}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

Run with: `npx ts-node src/lib/__tests__/prisma.test.ts`

---

## Files to Create/Modify

| File Path | Action | Description |
|-----------|--------|-------------|
| `prisma/schema.prisma` | Replace | Complete database schema with 6 models |
| `src/features/session/session.types.ts` | Create | TypeScript type definitions mirroring Prisma models |
| `prisma/seed.ts` | Create | Database seed script structure |
| `src/lib/db-utils.ts` | Create | Common database utility functions |
| `package.json` | Modify | Add Prisma seed configuration and scripts |

---

## Definition of Done

- [ ] `npx prisma generate` succeeds without errors
- [ ] `npx prisma db push` creates all tables successfully (or `migrate dev` completes)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Schema contains all 6 models: `User`, `UserConsent`, `SpeakingSession`, `Transcript`, `Insight`, `PatternProfile`
- [ ] `session.types.ts` exports all type aliases correctly
- [ ] `SessionStatus`, `ConsentFlag`, `InsightCategory`, and `InsightSeverity` are defined as union types
- [ ] `db-utils.ts` provides helper functions for common operations
- [ ] All database files have one-line header comments
- [ ] Prisma Studio can open and view tables: `npx prisma studio`
- [ ] No `any` types in type definition files

---

## Notes for Cursor

- The schema uses `cuid()` for IDs (collision-resistant unique identifiers)
- All foreign keys have `onDelete: Cascade` for data integrity
- Indexes are added on frequently queried fields (`userId`, `createdAt`, `sessionId`)
- Use `@@map()` to control table names (snake_case in DB, PascalCase in Prisma)
- Always use the re-exported types from `session.types.ts` in application code
- Never use Prisma enums directly in business logic; use the union types instead
