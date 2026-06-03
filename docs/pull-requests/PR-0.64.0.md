# PR-0.64.0 — Corpus Foundation (PACKET-45)

**Branch:** `feat/corpus-foundation` → `main`
**Version:** `0.64.0`
**Date:** 2026-06-03
**Status:** Open

---

## Summary

Adds a Postgres-backed corpus reference layer seeded from 8 academic frequency/collocation datasets. Provides deterministic lexeme lookup, batch vocabulary resolution, collocation matching, and multi-word expression attestation. Foundation for PACKET-46 (grounded scoring) and PACKET-48 (grammar pipeline).

---

## What Was Built

### Schema (3 new models)

| Model | Rows | Sources | Purpose |
|-------|------|---------|---------|
| `Lexeme` | 87,926 | NGSL, NAWL, SUBTLEX-US, CEFR-J, Octanove | Word frequency, CEFR level, Zipf score |
| `Collocation` | 52,233 | ACL, COCA (top 50k by MI) | Word-pair associations with MI/freq |
| `MultiWordExpression` | 757 | PHaVE, AFL | Phrasal verbs + academic formulas |

All models use `pg_trgm` GIN indexes for efficient fuzzy matching.

### Query Layer (`src/lib/corpus/`)

| Function | Purpose |
|----------|---------|
| `lookupLexeme(lemma, pos?)` | Single-word freq + CEFR with source-priority resolution |
| `batchLookup(words)` | Bulk transcript vocabulary resolution → `Map<string, LexemeLookup>` |
| `findCollocation(head, collocate)` | Collocation pair lookup across ACL + COCA |
| `attestExpression(phrase)` | Multi-word expression attestation (phrasal verbs, formulas) |

### Infrastructure

- 2 migrations (corpus tables + pos nullable fix)
- `pg_trgm` extension enabled
- Seed script (`scripts/seed-corpus.ts`) — already run against prod DB
- `data/` added to `.gitignore` (136 MB source datasets)

---

## Architecture Decisions

- **Postgres, not vector RAG** — data is static and pre-computed; no need for embedding similarity
- **Source priority is deterministic** — iterates `SOURCE_PRIORITY` array in order, not DB return order
- **Idempotent seed** — `createMany({ skipDuplicates: true })` makes re-runs safe

---

## Testing

- `npx tsc --noEmit` — type-checks clean
- `npm run lint` — no violations
- Seed verified: `SELECT count(*) FROM lexemes` = 87,926; `collocations` = 52,233; `multi_word_expressions` = 757
- Source priority verified: `lookupLexeme('however')` returns NGSL row (highest priority) over SUBTLEX

---

## Deployment Notes

- Migrations already applied to Neon prod
- Seed already run — 140,886 rows in prod DB
- No env vars needed
- No API routes added (query layer is internal, consumed by future packets)
