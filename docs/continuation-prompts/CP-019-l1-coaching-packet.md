# CP-019: L1 Pronunciation Coaching - Create PACKET-41

**Session:** 019 | **Date:** 2026-05-27 | **Branch:** feat/pipeline-trace
**Status:** READY

---

## Current State

You are building the **Learning Speaking App** (Next.js 15, TypeScript, Prisma, PostgreSQL). Packets 31-39 are complete. Azure Speech is provisioned (F0 free tier, East US). Three deep research outputs have locked the pronunciation coaching architecture.

### Architecture Decision (LOCKED)

Three deep research outputs converge on the same verdict: **Rule DB first, vector DB later (if ever).**

- **Stage 0 (now):** ~30 L1-to-L2 bridge rules in Prisma, wired to Azure NBestPhonemes, dialect onboarding
- **Stage 1 (month 2-3):** HVPT stimulus bank (Common Voice CC0 + TED talks + own recordings via Montreal Forced Aligner)
- **Stage 2 (month 4-6, only if data demands):** Shahin-style phonological-attribute classifier on Modal, triggered only on AccuracyScore 40-60 for brittle phonemes
- **Stage 3 (5K+ sessions only):** Own end-to-end MDD

Key findings:
- ELSA uses ASR + posterior-deviation scoring, NOT vector DBs (confirmed via patents WO2021146565A1, US20220189337A1)
- BoldVoice uses utterance-level accent fingerprints for progress tracking, NOT phoneme-level retrieval
- Explicit contrastive feedback (Hedges' g = 0.86) beats continuous similarity feedback (g = 0.50)
- HVPT multi-talker variability produces g = 0.92 perception gains

### Branches in flight
- `feat/recording-ux` - PACKET-39 (recording UX flow). Staged but NOT yet committed. Also contains PACKET-33 fixes.
- `feat/pipeline-trace` - current branch (pipeline trace visualization, no changes this session)

### Pending work
- `feat/recording-ux` needs commit + push before any new packet work

## The ONE Next Action

**Create PACKET-41 for L1 pronunciation coaching rule DB.** This requires:

1. **Rename existing packets 41-55 to 42-56** (both `docs/build-packets/PACKET-NN-*.md` and `docs/cursor-tasks/PACKET-NN/` folders). Current 41 is observability-foundation, current 55 is app-store-submission.
2. **Create PACKET-41-l1-pronunciation-coaching.md** following the existing packet format (see any PACKET-39 or PACKET-40 as template)
3. **Create cursor task files** in `docs/cursor-tasks/PACKET-41/` starting at TASK-339

### Packet scope (Stage 0 from the research):
- Prisma schema: PhonemeBridgeRule, MinimalPair, ReferenceAudio models
- Seed data: ~30 bridge rules from the interference table in L1-COACHING-RESEARCH-1-BUILD-PLAN.md
- Azure NBestPhonemes wiring: diagnose() function matching (expected, spoken, dialect)
- Dialect onboarding: 6 buckets (Mexican, Caribbean, Andean, Rioplatense, Castilian, Other)
- UI: phoneme feedback card with articulatory bridge text + minimal pair drill
- NO audio clips in this packet (that's Stage 1 / HVPT stimulus bank)

## Key Files to Read

1. `docs/research/L1-COACHING-RESEARCH-1-BUILD-PLAN.md` - interference table, Prisma model, Azure wiring code, phased plan
2. `docs/research/L1-COACHING-RESEARCH-3-DECISION-REPORT.md` - final architecture verdict with staged hybrid recommendation
3. `docs/build-packets/PACKET-39-recording-ux-flow.md` - packet format template
4. `docs/cursor-tasks/PACKET-40/TASK-294-time-limit-options.md` - cursor task format template
5. `docs/session-prompts/019-2026-05-27-l1-coaching-architecture-decision.md` - this session's log (if it exists)

## Project Rules Reminder
- Git rule: Claude Code is READ-ONLY for git. User does all commits/pushes.
- 4-file component pattern for React components
- No `any`, no `as` assertions (except `as const`), Zod at all boundaries
- File header comments on every code file
- Golden Goose Rule: public docs never reference internal tooling (packets, cursor tasks)
- Highest task number so far: TASK-338 (next task starts at TASK-339)
- Packets 31-39 complete, PACKET-40 exists (recording-ux-improvements)
