# Trial Task Transcript — SSL Care AI Voice Agent System Design

**Date:** Pre-2026 (previous job application)
**Format:** Whiteboard video walkthrough (~59 minutes)
**Task:** Design an AI voice agent system for Sunrise Senior Living (SSL) to automate incoming phone calls

---

## Context

Manuel was given a PDF brief describing SSL's call center operations (12 facilities, 8 operators) and asked to design an AI voice agent system to handle incoming calls. The deliverable was a video walkthrough of his thinking process, system diagram, MVP phasing, timeline, and questions for the stakeholder (Zara).

---

## Section 1 — Problem Analysis & Assumptions

### What SSL Wants Automated
- Visiting hours inquiries
- Meal menu questions
- Callback requests
- General facility information

### Data Sources Identified
1. **SharePoint** — well-documented Microsoft Graph API (public API, straightforward integration)
2. **Meal menu PDFs** — uploaded manually daily (high-risk: unknown if machine-readable or standardized)
3. **K-Track system** — API available but documentation incomplete (big unknown)
4. **General facility information** — static knowledge base

### Requirements from Brief
- Family members and staff must be verified
- Every call must be logged regardless of outcome
- AI is allowed two attempts per decision before escalating to operator

### 6 Key Assumptions (each validated by stakeholder questions)

1. **SSL has its own internal phone system** — like a hotel with branches, the system knows if a call is internal (from a room) or external. This metadata reaches the AI before any conversation begins.

2. **SSL manages 12 extensions** (one per facility) — operators and AI already know which facility the call is about.

3. **Residents don't need verification** — because the internal phone system already identifies them by room/extension metadata.

4. **Rooms have unique IDs** — so AI immediately knows if the caller is from a dementia unit (restricted visiting hours) or standard unit.

5. **Four caller types:** Resident, Family Member, Staff Member, General Information Caller + one edge case (Unknown Caller → direct transfer to human operator).

6. **K-Track API has enough information to verify family members** — enables Phase 1 development of the verification path.

### Biggest Unknown
Callback workflow end-to-end is not mentioned in the PDF. How callbacks are logged, how staff communicates back to family members after a request — flagged directly to Zara. **Deferred to Phase 2.**

---

## Section 2 — System Diagram (5-Checkpoint Architecture)

### Flow Overview

```
Caller dials SSL number
        │
        ▼
SSL Internal Phone System
(collects metadata: facility, room, internal/external)
        │
        ▼
Care AI System receives metadata
        │
        ├── Internal path (resident calling from room)
        │         │
        │         ▼
        │   [Checkpoint 1: Caller Type] ──No──► Human Operator (call logged)
        │         │ Yes
        │         ▼
        └── External path
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  4 Caller Types Identified:     │
    │  • Resident (internal, no auth) │
    │  • Family Member (needs auth)   │
    │  • Staff Member (needs auth)    │
    │  • General Info (no auth)       │
    └─────────────────────────────────┘
                  │
    Family/Staff merge into one path
                  │
                  ▼
    [Checkpoint 2: Authentication] ──No──► Human Operator (call logged)
    (K-Track API call, 2 attempts allowed)
                  │ Yes
                  ▼
    All verified callers + residents merge
                  │
                  ▼
    "How can I help you today?"
                  │
                  ▼
    [Checkpoint 3: Scope] ──No──► Human Operator (call logged)
    (Is the request within AI's capabilities?)
                  │ Yes
                  ▼
    ┌─────────────────────────────────────┐
    │  4 Request Types:                   │
    │  • Visiting Hours → SharePoint API  │
    │  • Meal Menu → PDF parsing          │
    │  • Callback → Unknown workflow      │
    │  • General Info → Static KB         │
    └─────────────────────────────────────┘
    (General Info caller connects here directly)
                  │
                  ▼
    [Checkpoint 4: Data] ──No──► Human Operator (call logged)
    (Was AI able to retrieve the requested data?)
                  │ Yes
                  ▼
    Deliver answer to caller
                  │
                  ▼
    [Checkpoint 5: Response] ──No──► Human Operator (call logged)
    (Is the caller fully satisfied?)
                  │ Yes
                  ▼
    Call completed successfully (logged)
```

### Key Design Decisions
- **Every checkpoint failure → human operator + call logged** — no dead ends
- **Every checkpoint has 2 attempts** before escalation — graceful, not punitive
- **All calls logged regardless of outcome** — successful calls provide system performance insights, failed calls reveal improvement areas
- **Unknown callers bypass all checkpoints** → direct transfer to human operator
- **Dementia unit awareness** — metadata from phone system tells AI if visiting hours are restricted before the caller even speaks

---

## Section 3 — MVP Phasing

### Phase 1 (MVP) — What Gets Built
1. **SharePoint integration** — visiting hours data
2. **K-Track integration** — authentication path (family members only)
3. **Static knowledge base** — general facility information
4. **AI voice agent** — core conversation engine with 5 checkpoints
5. **Dashboard** — call logs and system monitoring
6. **Phone system integration** — connect to SSL's existing infrastructure

### Phase 1 Handles These Callers
- ✅ Residents (no auth needed, internal metadata)
- ✅ Family members (K-Track auth)
- ✅ General information callers (static KB, no auth)

### NOT in Phase 1 (Deferred to Phase 2+)
- ❌ Meal menu PDF parsing (risk: unknown if standardized/machine-readable)
- ❌ Callback workflow (big unknown: end-to-end flow not documented)
- ❌ Staff member authentication (don't know where PINs are stored)
- ❌ SSL phone system deep integration

---

## Section 4 — Timeline Estimates

| Component | Estimate |
|---|---|
| SharePoint integration | 2 days |
| K-Track authentication | 4 days (risk: incomplete API docs) |
| Static knowledge base schema + tests | 4 days |
| General facility data collection (2 facilities) | 2 days |
| AI voice agent | 5-7 days (hardest component) |
| Dashboard | 5-6 days |
| Phone system integration | 5 days |
| **Phase 1 Total** | **~3-4 weeks** |

### Voice Agent Challenges Flagged
- Elderly speech recognition accuracy
- Regional accent/dialect handling
- Each checkpoint needs voice-specific testing
- Conversation flow edge cases at every diamond decision

---

## Section 5 — Blockers & Risks

### Blockers (will delay project if assumptions are wrong)
- All 6 assumptions above — if any are incorrect, diagram needs redesign

### Risks
- K-Track authentication — unknown auth method and API completeness
- AI voice agent — speech recognition quality with elderly callers
- Meal menu PDFs — unknown format standardization

---

## Section 6 — Questions for Zara (Stakeholder)

1. Does SSL have an internal phone system?
2. Does SSL manage extensions and collect room metadata?
3. Do residents need to be verified?
4. How many caller types exist?
5. Can I have full K-Track system documentation?
6. What is the full callback workflow end-to-end?
7. Do operators work 24 hours? (if not, AI availability must be limited)
8. How are dementia unit rooms organized/separated?

---

## Why This Matters for Portfolio

This transcript demonstrates:
- **First-principles problem solving** — started from a PDF brief, built assumptions, validated with stakeholder questions
- **System design thinking** — checkpoint-based architecture with graceful degradation
- **First design partner mentality** — understanding real problems (not just what was asked), flagging unknowns, phasing by risk
- **Agentic system design** — multi-step decision loops, tool/API orchestration, self-correcting flow (2 attempts per checkpoint)
- **Honest risk assessment** — explicitly deferred what couldn't be built safely in Phase 1
- **Tribal knowledge capture** — the entire system is designed to capture and automate call center operator knowledge
