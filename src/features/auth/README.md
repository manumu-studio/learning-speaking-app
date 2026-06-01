# Auth Feature

> Configures NextAuth v5 with a custom OIDC provider and syncs authenticated users to the local database.

## Responsibilities
- NextAuth provider setup with OIDC/PKCE (ManuMuStudio OAuth server)
- JWT and session callbacks that expose `externalId` to the app
- Find-or-create user sync after first sign-in
- E2E test session bypass (never active in production)
- Client-side re-export of `useSession` for React components

## Key Modules
| File | Purpose |
|------|---------|
| `auth.ts` | NextAuth configuration — provider, JWT/session callbacks, `auth()` server helper |
| `syncUser.ts` | `syncUser()` — upserts a Prisma `User` row from OIDC profile data |
| `useSession.ts` | Re-exports `useSession` from `next-auth/react` for client components |
| `auth.types.ts` | TypeScript augmentations for NextAuth session shape |
| `index.ts` | Barrel export |

## Data Flow
- `auth()` is called server-side (route handlers, Server Components) to get the current session.
- On first sign-in, `syncUser()` is called with the OIDC `sub`, email, and display name to create the local `User` record.
- Client components consume `useSession()` for reactive auth state.

## Conventions
- All OIDC profile fields validated with Zod before use — no `as string` casts.
- Types in `auth.types.ts`; barrel export via `index.ts`.
