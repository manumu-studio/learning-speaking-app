# ADR-004: Four-file component pattern

**Date:** 2026-04-03  
**Status:** Accepted  

## Context

The UI mixes shared primitives (`src/components/ui`) and feature modules (`src/features`). As the team and surface area grow, single-file components mixed props, hooks, and side effects, making reviews and reuse harder.

## Decision

Each React component lives in a folder: **`Component.tsx`**, **`Component.types.ts`** (exported prop interfaces), **`index.ts`** barrel, and optionally **`useComponent.ts`** for hooks. `'use client'` only when browser APIs or React client hooks are required. This is documented in `CONTRIBUTING.md` and applied consistently under `src/components` and `src/features`.

## Alternatives considered

- **Single file per component** — fastest for prototypes; scales poorly for typed props and hook extraction.
- **Colocated `types.ts` without barrel** — deep import paths and inconsistent public API.
- **CSS modules + component in one file** — acceptable for tiny leaf components; still split types when props grow.

## Consequences

- **Pros:** Clear import graph; props are discoverable; hooks test in isolation (see `*.test.ts` next to hooks).
- **Cons:** More files per widget; slight overhead for one-off trivial components.
- **Exception:** Next.js App Router `page.tsx` / `layout.tsx` may use default exports as required by the framework.
