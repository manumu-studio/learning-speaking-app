# PACKET-01 — Project Scaffold

**Branch:** `feature/scaffold`
**Version:** `0.1.0`
**Prerequisites:** None (clean project start)

---

## Overview

Bootstrap the Learning Speaking App with Next.js 15, TypeScript strict mode, Tailwind CSS, and core project structure. This packet establishes the foundation for all future development.

---

## What to Build

### 1. Initialize Next.js 15 with App Router

Run the following command in the project root:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Important:** The project already has a `docs/` folder. Do NOT overwrite it. If prompted, skip or merge carefully.

---

### 2. Configure TypeScript Strictly

Replace the contents of `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### 3. Install Core Dependencies

```bash
npm install prisma @prisma/client zod clsx tailwind-merge
npm install -D @types/node ts-node
```

---

### 4. Create Folder Structure

Create the following directories and placeholder files:

```
src/
├── app/
│   ├── (app)/
│   │   └── layout.tsx
│   ├── (public)/
│   │   └── page.tsx
│   └── api/
│       └── .gitkeep
├── components/
│   └── ui/
│       └── .gitkeep
├── features/
│   ├── auth/
│   │   └── .gitkeep
│   ├── recording/
│   │   └── .gitkeep
│   ├── session/
│   │   └── .gitkeep
│   └── insights/
│       └── .gitkeep
├── lib/
│   ├── env.ts
│   ├── prisma.ts
│   └── utils.ts
└── prisma/
    └── schema.prisma
```

---

### 5. Create `src/lib/env.ts`

Environment variable validation using Zod:

```typescript
// Environment variable validation using Zod
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AUTH_CLIENT_ID: z.string().min(1),
  AUTH_CLIENT_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

---

### 6. Create `src/lib/prisma.ts`

Prisma client singleton for database access:

```typescript
// Prisma client singleton for database access
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

### 7. Create `src/lib/utils.ts`

Shared utility functions:

```typescript
// Shared utility functions
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### 8. Create `.env.example`

Template for environment variables:

```bash
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=

# AI Services (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Cloudflare R2 (optional)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Upstash QStash (optional)
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# App Config
APP_URL=http://localhost:3000
NODE_ENV=development
```

---

### 9. Verify `.gitignore` Includes `.env.local`

Ensure `.gitignore` contains:

```
.env*.local
.env.local
```

---

### 10. Create Landing Page

Create `src/app/(public)/page.tsx`:

```typescript
// Landing page for unauthenticated users
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="container flex max-w-2xl flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Learning Speaking App
        </h1>
        <p className="text-xl text-gray-600">
          Practice speaking, get instant AI feedback, and track your progress over time.
        </p>
        <button
          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-700"
          disabled
        >
          Sign in to start
        </button>
        <p className="text-sm text-gray-500">
          Authentication will be enabled in the next phase
        </p>
      </div>
    </div>
  );
}
```

---

### 11. Create Placeholder Protected Layout

Create `src/app/(app)/layout.tsx`:

```typescript
// Protected layout — auth middleware will be added in PACKET-03
import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
```

---

### 12. Create Empty Prisma Schema

Create `prisma/schema.prisma`:

```prisma
// Prisma schema file
// Database schema will be added in PACKET-02

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Files to Create/Modify

| File Path | Action | Description |
|-----------|--------|-------------|
| `tsconfig.json` | Modify | Enable strict TypeScript configuration |
| `src/lib/env.ts` | Create | Zod-based environment variable validation |
| `src/lib/prisma.ts` | Create | Prisma client singleton |
| `src/lib/utils.ts` | Create | Tailwind class name utility |
| `src/app/(public)/page.tsx` | Create | Landing page for unauthenticated users |
| `src/app/(app)/layout.tsx` | Create | Protected app layout (placeholder) |
| `prisma/schema.prisma` | Create | Empty Prisma schema shell |
| `.env.example` | Create | Environment variable template |
| `.gitignore` | Verify | Ensure `.env.local` is ignored |

---

## Definition of Done

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds without warnings
- [ ] `npm run dev` starts the development server
- [ ] Visiting `http://localhost:3000` shows the landing page
- [ ] Folder structure matches the specification exactly
- [ ] All TypeScript files have one-line header comments
- [ ] `env.ts` exports validated environment variables
- [ ] `.env.example` exists with all variable names listed
- [ ] `prisma.ts` exports a singleton Prisma client
- [ ] `utils.ts` exports the `cn()` function
- [ ] No `any` types in any file
- [ ] ESLint shows no errors

---

## Notes for Cursor

- Follow the 4-file component pattern for all future components
- Every code file must start with a one-line comment describing its purpose
- Use named exports only (except Next.js page/layout/route defaults)
- Use `@/` import alias for all internal imports
- No `any` types, no non-null assertions (`!`), no optional chaining abuse
- Use union types instead of enums wherever possible
