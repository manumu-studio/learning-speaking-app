# Build Report — PACKET-07b: Claude Analysis Client + Zod Schema

**Author:** Senior Engineer
**Date:** 2026-02-18
**Branch:** `feature/processing-pipeline`
**Version:** `0.7.0`
**Status:** ✅ COMPLETE (07b of 07a/07b/07c)

---

## Executive Summary

PACKET-07b is complete. The Claude Haiku analysis client is live with a Zod schema that maps exactly to the Prisma `Insight` model. `analyzeTranscript()` accepts a raw transcript string and returns a validated `AnalysisResult` ready for direct Postgres insertion. All validation gates pass.

---

## Definition of Done — 07b Checklist

| Requirement | Status | Notes |
|---|---|---|
| `src/lib/ai/analyze.ts` created | ✅ | Single file, all exports named |
| `analyzeTranscript(transcript)` exported | ✅ | Returns `Promise<AnalysisResult>` |
| `AnalysisResult` type exported | ✅ | Inferred from Zod schema |
| `Insight` type exported | ✅ | Inferred from Zod schema |
| Zod schema matches Prisma `Insight` model fields | ✅ | Field-by-field mapping verified |
| `insightSchema` — `category` enum validated | ✅ | `'grammar' \| 'vocabulary' \| 'structure'` |
| `insightSchema` — `severity` enum validated | ✅ | `'high' \| 'medium' \| 'low'` (optional) |
| `insightSchema` — `examples` as string array | ✅ | `z.array(z.string()).optional()` |
| `analysisResultSchema` — max 5 insights | ✅ | `.max(5)` on insights array |
| `focusNext` field present in schema | ✅ | Maps to `SpeakingSession.focusNext` |
| Lazy singleton pattern used | ✅ | `_anthropicClient` initialized on first call |
| `requireEnv()` runtime validation | ✅ | Throws descriptive error if key absent |
| No `!` non-null assertions | ✅ | `?? null` guard on `content[0]` |
| `JSON.parse` result typed as `unknown` | ✅ | Forces Zod parse, no silent `any` |
| `env.ts` not modified | ✅ | `ANTHROPIC_API_KEY` already optional |
| `@anthropic-ai/sdk` installed | ✅ | Added to `package.json` |
| `npx tsc --noEmit` — zero errors | ✅ | One fix applied (see Deviations) |
| `npm run build` — clean build | ✅ | All routes compiled |

---

## What Was Built

### `src/lib/ai/analyze.ts` — Claude Analysis Client

**`getAnthropicClient(): Anthropic`** (private)
Lazy singleton factory. Validates `ANTHROPIC_API_KEY` at first call via `requireEnv()`, then caches the `Anthropic` instance in the module-scoped `_anthropicClient` variable.

**`ANALYSIS_PROMPT`** (private constant)
System prompt instructing Claude to:
- Find 3–5 RECURRING patterns (not isolated corrections)
- Categorize each as `grammar`, `vocabulary`, or `structure`
- Return strict JSON matching the schema — no markdown wrappers
- Include `focusNext` (one actionable goal) and `summary` (2–3 sentence assessment)

**`insightSchema` / `analysisResultSchema`** (private Zod schemas)
Field-by-field mapping to Prisma `Insight` model:

| Zod field | Zod type | Prisma field | Prisma type |
|---|---|---|---|
| `category` | `z.enum([...])` | `category` | `String` |
| `pattern` | `z.string()` | `pattern` | `String` |
| `detail` | `z.string()` | `detail` | `String @db.Text` |
| `frequency` | `z.number().optional()` | `frequency` | `Int?` |
| `severity` | `z.enum([...]).optional()` | `severity` | `String?` |
| `examples` | `z.array(z.string()).optional()` | `examples` | `Json?` |
| `suggestion` | `z.string().optional()` | `suggestion` | `String? @db.Text` |

**`analyzeTranscript(transcript: string): Promise<AnalysisResult>`** (exported)
1. Calls `client.messages.create` with model `claude-haiku-4-5-20251001`, `max_tokens: 2048`
2. Guards against undefined `content[0]` with `?? null` check
3. Guards against non-text response blocks
4. `JSON.parse`s the response as `unknown`
5. Runs `analysisResultSchema.parse()` — throws `ZodError` on schema mismatch

---

## Deviations from Packet Instructions

| Deviation | Reason |
|---|---|
| `?? null` guard on `message.content[0]` | SDK types `ContentBlock[]`; indexing returns `ContentBlock \| undefined` under `noUncheckedIndexedAccess`. The packet used direct `content.type` access which would fail strict TypeScript. |
| `unknown` cast on `JSON.parse` result | `JSON.parse` returns `any`; typed as `unknown` before Zod parse to prevent `any` propagation under strict config. |

---

## Validation Output

### `npx tsc --noEmit`
```
(no output — clean pass)
Exit code: 0
```

### `npm run build`
```
✓ Compiled successfully in 3.0s
✓ Generating static pages (9/9)
Exit code: 0
```

---

## Known Issues / Technical Debt

| ID | Severity | Description | Recommended Action |
|---|---|---|---|
| TD-21 | Low | `claude-haiku-4-5-20251001` hardcoded model string | Move to named constant or env var to support model upgrades without code changes |
| TD-22 | Low | `max_tokens: 2048` hardcoded | Benchmark actual token usage and tune; could be reduced to lower cost |
| TD-23 | Medium | `JSON.parse` fails silently if Claude wraps response in markdown fences | Add a pre-parse step to strip ` ```json ` wrappers if present — models sometimes ignore "JSON only" instructions |
| TD-24 | Low | No retry on `ZodError` (malformed Claude response) | Consider re-prompting once on parse failure before propagating error to pipeline |

---

## Prerequisites for PACKET-07c

1. ✅ `analyzeTranscript(transcript)` importable from `@/lib/ai/analyze`
2. ✅ `AnalysisResult` and `Insight` types exported for use in webhook handler
3. ✅ Zod schema guarantees output is safe to write directly to Prisma `Insight` model
4. ✅ `focusNext` field present and validated — ready to update `SpeakingSession.focusNext`
