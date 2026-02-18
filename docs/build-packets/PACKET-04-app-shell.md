# PACKET-04 — App Shell & Protected Layout

**Branch**: `feature/app-shell`
**Version**: `0.4.0`
**Prerequisites**:
- PACKET-03 complete (next-auth v5 + OIDC setup)
- `auth()` available from `@/features/auth/auth`
- Prisma client configured and migrations applied
- Environment variables set:
  - `DATABASE_URL`
  - `AUTH_CLIENT_ID`
  - `AUTH_CLIENT_SECRET`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`

---

## What to Build

### 1. Create the protected app layout

**File**: `src/app/(app)/layout.tsx`

```typescript
// Protected layout wrapper — checks auth and renders app chrome
import { auth } from '@/features/auth/auth';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/ui/TopBar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}
```

### 2. Create the TopBar component

**Directory**: `src/components/ui/TopBar/`

**File**: `TopBar.tsx`

```typescript
// Top navigation bar with app branding and user menu
'use client';

import { signOut } from 'next-auth/react';
import { MainNav } from '@/components/ui/MainNav';
import type { TopBarProps } from './TopBar.types';

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: App branding */}
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-semibold text-gray-900">
              Learning Speaking App
            </h1>
            <MainNav />
          </div>

          {/* Right: User info + sign out */}
          <div className="flex items-center space-x-4">
            {(userName || userEmail) && (
              <div className="text-sm text-right">
                {userName && (
                  <div className="font-medium text-gray-900">{userName}</div>
                )}
                {userEmail && (
                  <div className="text-gray-500">{userEmail}</div>
                )}
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

**File**: `TopBar.types.ts`

```typescript
// TopBar component prop types
export interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
}
```

**File**: `index.ts`

```typescript
export { TopBar } from './TopBar';
export type { TopBarProps } from './TopBar.types';
```

### 3. Create the MainNav component

**Directory**: `src/components/ui/MainNav/`

**File**: `MainNav.tsx`

```typescript
// Main navigation links with active state highlighting
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MainNavProps } from './MainNav.types';

const navItems = [
  { href: '/session/new', label: 'New Session' },
  { href: '/history', label: 'History' },
] as const;

export function MainNav({ className = '' }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`flex space-x-6 ${className}`}>
      {navItems.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-600 border-b-2 border-blue-600 pb-4'
                : 'text-gray-600 hover:text-gray-900 pb-4'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**File**: `MainNav.types.ts`

```typescript
// MainNav component prop types
export interface MainNavProps {
  className?: string;
}
```

**File**: `index.ts`

```typescript
export { MainNav } from './MainNav';
export type { MainNavProps } from './MainNav.types';
```

### 4. Create the Container component

**Directory**: `src/components/ui/Container/`

**File**: `Container.tsx`

```typescript
// Content wrapper with max-width and padding
import type { ContainerProps } from './Container.types';

export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 ${className}`}>
      {children}
    </div>
  );
}
```

**File**: `Container.types.ts`

```typescript
// Container component prop types
import type { ReactNode } from 'react';

export interface ContainerProps {
  children: ReactNode;
  className?: string;
}
```

**File**: `index.ts`

```typescript
export { Container } from './Container';
export type { ContainerProps } from './Container.types';
```

### 5. Create placeholder pages

**File**: `src/app/(app)/session/new/page.tsx`

```typescript
// New recording session page
import { Container } from '@/components/ui/Container';

export default function NewSessionPage() {
  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Start a New Session
      </h1>
      <p className="text-gray-600">
        Recording interface will be implemented in PACKET-05.
      </p>
    </Container>
  );
}
```

**File**: `src/app/(app)/session/[id]/page.tsx`

```typescript
// Session results and analysis page
import { Container } from '@/components/ui/Container';

export default function SessionResultsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Session Results
      </h1>
      <p className="text-gray-600">Session ID: {params.id}</p>
      <p className="text-gray-600 mt-2">
        Results display will be implemented in PACKET-07.
      </p>
    </Container>
  );
}
```

**File**: `src/app/(app)/history/page.tsx`

```typescript
// Session history list page
import { Container } from '@/components/ui/Container';

export default function HistoryPage() {
  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Session History
      </h1>
      <p className="text-gray-600">
        History list will be implemented in PACKET-07.
      </p>
    </Container>
  );
}
```

### 6. Update the public landing page

**File**: `src/app/(public)/page.tsx`

```typescript
// Public landing page with conditional CTAs
import { auth } from '@/features/auth/auth';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Learning Speaking App
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Practice speaking naturally. Get AI-powered feedback on fluency,
          clarity, and communication patterns.
        </p>

        {session?.user ? (
          <Link
            href="/session/new"
            className="inline-block px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/auth/signin"
            className="inline-block px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In to Start
          </Link>
        )}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/app/(app)/layout.tsx` | Protected layout with auth check + TopBar |
| `src/components/ui/TopBar/TopBar.tsx` | Top navigation bar component |
| `src/components/ui/TopBar/TopBar.types.ts` | TopBar prop types |
| `src/components/ui/TopBar/index.ts` | Barrel export |
| `src/components/ui/MainNav/MainNav.tsx` | Navigation links with active state |
| `src/components/ui/MainNav/MainNav.types.ts` | MainNav prop types |
| `src/components/ui/MainNav/index.ts` | Barrel export |
| `src/components/ui/Container/Container.tsx` | Content wrapper component |
| `src/components/ui/Container/Container.types.ts` | Container prop types |
| `src/components/ui/Container/index.ts` | Barrel export |
| `src/app/(app)/session/new/page.tsx` | New session page placeholder |
| `src/app/(app)/session/[id]/page.tsx` | Session results page placeholder |
| `src/app/(app)/history/page.tsx` | History page placeholder |
| `src/app/(public)/page.tsx` | Updated landing page with conditional CTAs |

---

## Definition of Done

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Authenticated users see TopBar + MainNav on all `(app)` pages
- [ ] Unauthenticated users redirected to `/auth/signin` when accessing `(app)` routes
- [ ] All 3 placeholder pages render correctly
- [ ] Navigation links work between pages
- [ ] Active navigation state highlights current page
- [ ] Sign out button redirects to landing page
- [ ] Landing page shows different CTAs for authenticated vs anonymous users
- [ ] All components follow 4-file pattern
- [ ] All files have header comments
- [ ] No TypeScript errors or warnings
- [ ] Layout is responsive (mobile-friendly)
