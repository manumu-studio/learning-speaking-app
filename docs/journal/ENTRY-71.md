# ENTRY-71 — Corpus Foundation (PACKET-45)

**Date:** 2026-06-03
**Type:** Feature
**Branch:** feat/corpus-foundation
**Version:** 0.64.0

---

## What I Did

Built the corpus reference layer — a Postgres-backed frequency and collocation dataset seeded from 8 academic sources. This replaces the need for vector RAG by storing pre-computed frequency data directly in the database. The query layer provides deterministic source-priority lookup (NGSL > NAWL > SUBTLEX > CEFR_J > OCTANOVE) so downstream features (grounded scoring, grammar pipeline) can assess vocabulary sophistication against real corpus data.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added Lexeme, Collocation, MultiWordExpression models with pg_trgm GIN indexes |
| `prisma/migrations/20260603163717_add_corpus_tables/` | Created | Initial corpus tables + pg_trgm extension |
| `prisma/migrations/20260603164752_fix_lexeme_pos_nullable/` | Created | Changed Lexeme.pos from nullable to `@default("")` |
| `scripts/seed-corpus.ts` | Created | Ingests 8 datasets: NGSL, NAWL, CEFR-J, Octanove, SUBTLEX-US, ACL, COCA (top 50k), PHaVE, AFL |
| `src/lib/corpus/corpus.types.ts` | Created | LexemeLookup, CollocationMatch, MweAttestation types |
| `src/lib/corpus/lookupLexeme.ts` | Created | Single-word frequency + CEFR lookup with source-priority resolution |
| `src/lib/corpus/batchLookup.ts` | Created | Bulk lookup for transcript vocabulary |
| `src/lib/corpus/findCollocation.ts` | Created | Collocation pair lookup (ACL + COCA) |
| `src/lib/corpus/attestExpression.ts` | Created | Multi-word expression attestation (PHaVE + AFL) |
| `src/lib/corpus/index.ts` | Created | Barrel exports |
| `.gitignore` | Modified | Added `data/` to exclude 136 MB corpus source datasets |

## Key Decisions

- **Postgres frequency tables, not vector RAG** — corpus data is pre-computed and static; embedding-based retrieval adds cost and latency for no benefit here
- **Source priority is deterministic** — iterate SOURCE_PRIORITY array order, not DB return order (bug found and fixed during review)
- **Lexeme.pos uses `@default("")` not nullable** — avoids null handling complexity in the unique constraint `[lemma, pos, source]`
- **Seed is idempotent** — uses `skipDuplicates: true` so re-running is safe
- **Data files excluded from git** — 136 MB of source CSVs/TSVs/XLSX stay in `data/` (gitignored), seed script references them

## Rationale

PACKET-46 (grounded scoring) and PACKET-48 (grammar pipeline) both need frequency and collocation data to assess vocabulary sophistication. Building the corpus layer first decouples the data foundation from the scoring logic, and seeding prod early lets us validate the dataset before building features on top.

## Metrics

- 140,886 total rows seeded (87,926 lexemes + 52,233 collocations + 757 MWEs)
- 8 academic datasets ingested
- 4 query functions exported
