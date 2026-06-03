# Robert @ Iyuno — Automation Engineer R1 Q&A
# Answers in Manu's exact words from transcripts. No invented vocabulary.

---

## WHAT IYUNO DOES

They're the world's biggest media localization company. Like Robert said — if you watch Netflix, Disney, or Apple TV and the content is in English, someone needs to dub it in Spanish, add subtitles, translate it. That's what Iyuno does. 2000 people, globally. They take the original content, localize it (dubbing, subtitles, translation), and send it back to the platforms to put on their systems or show at the cinema.

## WHAT YOU WOULD BE DOING

You'd sit inside their Technology division. Not the dubbing side, not the creative side. The engineering/operations side.

Think of it this way — 2000 people across the world doing localization work. That means:
- **Broken handoffs** between studios, teams, systems
- **Repetitive manual work** that someone does every day by clicking around
- **Workflows that could be faster** if someone scripted them or connected two systems with an API

**Your job:** find those friction points, build a solution (Python script, API integration, AI-assisted tool, whatever works), validate it with the people who use it, harden it to production, hand it off with documentation, move to the next problem.

**In simple terms:** you're the person who walks into a team, sees them doing something manually that takes 3 hours, and builds a tool that does it in 10 minutes. Then you document it, hand it over, and go find the next problem.

**What it's NOT:** you're not doing AI research, you're not writing strategy documents, you're not working alone. You have senior engineers and security architects supporting you. And it's not a demo factory — if it doesn't go to production, it doesn't count.

**Success in 12 months:** 5+ automations shipped and owned by teams, measurable time/cost savings, a backlog of next opportunities.

**The communication part is mostly written, not spoken.** The JD says it: "Good written communication. You can explain what you built and why it matters in plain English." That means documentation, PR descriptions, handoff notes — things you already do in every project. The spoken part is practical and short: "What are you doing manually?" "Here's a prototype, does it work?" "Does this solve your problem?" It's not presentations, not strategy meetings, not running committees. It's showing your work and getting feedback.

This maps almost perfectly to how you worked on the SSL trial task — you took a brief, identified the data sources, ranked what to automate first by risk and impact, phased the delivery, and documented everything.

---

## ROBERT'S 6 LIKELY QUESTIONS

---

### Q1. "Tell me about yourself and your background"

> "I studied industrial engineering in Argentina, and then I moved to Spain trying to get a master's. But then I met my partner in Israel. And then I moved to Israel, and I saw the high-tech there is very strong. And while I was getting the residency, I studied web development."
>
> "And then I worked in a startup — a small startup — and they were working with machine learning as well. And I was in charge to connect the back end with the front end, and they were using Python with Flask."
>
> "And then everything became a bit harsh because of the war. I needed to move. And since then, I've been having clients, and I've been building products end to end. I've been evolving with the industry depending on the needs of the application."
>
> "In the past few years, I've been working as a solo engineer. That's why I'm also looking for the opportunity to work in a team."

---

### Q2. "How do you use AI tools in your work?" ⭐

> "I'm not just AI-native. Because I learned coding the hard way when the tools didn't exist. But over time, I started adapting them in my daily work. So the productivity is not because the AI can code faster. It's because I built a system around it. And so I can get the right output."
>
> "I have three layers because I work in parallel as a team with Cursor and Claude. Claude is the architect and the supervisor. Cursor is the executor. And me, I'm the product owner, and I revise everything."
>
> "I have four rules. The first one is a CLAUDE.md file as a constitution. It has the rules, the standards, how the files have to be built."
>
> "The second rule — I have an interview before it generates. It asks me questions about each decision and the trade-offs before coding."
>
> "The third pillar is the context window management. When the context reaches forty percent, I close the session and save a continuation prompt."
>
> "And the fourth one is test and validation. Pydantic on the backend, Zod on the frontend. pytest and Vitest for tests."

---

### Q3. "How would you find automation opportunities in a team you don't know?"

> "I started from a brief, built assumptions, validated with stakeholder questions."
>
> "I identified the data sources. SharePoint — well-documented API, straightforward integration. Meal menu PDFs — uploaded manually daily. K-Track system — API available but documentation incomplete."
>
> "Every checkpoint failure goes to human operator plus call logged — no dead ends. Every checkpoint has two attempts before escalation — graceful, not punitive. All calls logged regardless of outcome."
>
> "NOT in Phase 1: meal menu PDF parsing — risk: unknown if standardized or machine-readable. Callback workflow — big unknown: end-to-end flow not documented."
>
> "I would start with the one that saves the most time with the least risk."

---

### Q4. "Walk me through something you built that's relevant to this role"

Lead with ISO Audit RAG (compliance automation = directly maps to ISO 27001 at Iyuno):

> "I created a RAG system, and I took a NIST 800-53 standard as a source and injected it in the ingestion pipeline."
>
> "What it does exactly is — the user has a question. Then two searches run in parallel: a BM25 for keyword search and a vector search for semantic search. They ranked fusion combines the results, and then Claude generates the answer in natural language with the exact citation."
>
> "This application took me the weekend. Three days."
>
> "I didn't want to come empty-handed."

If he asks about shipping multiple things or AI integration:

> "I also built another application that helps people to tailor their CVs every time that they need, empowered by AI with Gemini, Anthropic, and OpenAI."
>
> "OR Studio is a client that I've been having for already more than two years. And with him, I built completely his website from the back end to front end."

If he asks about async pipelines / orchestrating services:

> "I built a learning speaking application. It uses an async queue with retry logic. Each stage is independent."

(From SSL trial task — shows how you design automation systems):

> "Every checkpoint failure goes to human operator plus call logged — no dead ends. Every checkpoint has two attempts before escalation — graceful, not punitive."

---

### Q5. "How do you handle documentation and handoffs?"

> "I work with branches. Each branch is a feature. And each feature has its own job."
>
> "Each feature has its own separate tasks, and I test before I create the PR. I test everything locally, and if it works and doesn't fail..."
>
> "You can see the flow, how I really work with them in the documentation. The pull requests. Everything is here. Each decision in each PR says exactly what I did."
>
> "I document everything. You can take a look at my GitHub, and everything is very well documented about the steps that I follow, the changes, the pivots that I've done."

---

### Q6. "What do you do when you don't know something?" / "Do you have experience with n8n, Zapier, Make?"

> "I haven't worked with [that] yet."
>
> "Let me think for a second, please."

Then bridge — from how you handled the SSL trial task with zero domain knowledge:

> "I started from a brief, built assumptions, validated with stakeholder questions."

And from Calibre R1 — building a compliance demo in a domain you didn't know:

> "I didn't want to come empty-handed."
>
> "This application took me the weekend. Three days."

Bridge pattern when any gap comes up:

> "I haven't worked with [that] yet." + explain what you DID build that solves the same problem.
>
> "I've been evolving with the industry depending on the needs of the application. So I've been evolving and learning those technologies as well."

---

## MANU'S CLOSING QUESTIONS FOR ROBERT

### OPTION A: 4 Questions (if salary was already discussed or not relevant yet)

**Q1 — Extracts the exact pain point to build a demo around:**
> "If I started next month, what would be the first problem you'd want me to look at?"

**Q2 — Extracts current tech stack and tooling landscape:**
> "What does the current tooling look like? Are teams mostly using internal scripts, or is there a mix of platforms and custom tools?"

**Q3 — Extracts handoff culture and how production-ready the work needs to be:**
> "When an automation is ready, how does the handoff work? Does the owning team maintain it, or does it come back if something breaks?"

**Q4 — Extracts team structure and who you'd work with daily:**
> "What does the team look like right now? Would I be joining an existing engineering team or helping build one out?"

---

### OPTION B: 3 Questions + Salary (if salary was NOT discussed during the interview)

**Q1 — Extracts the exact pain point to build a demo around:**
> "If I started next month, what would be the first problem you'd want me to look at?"

**Q2 — Extracts current tech stack and tooling landscape:**
> "What does the current tooling look like? Are teams mostly using internal scripts, or is there a mix of platforms and custom tools?"

**Q3 — Extracts handoff culture and how production-ready the work needs to be:**
> "When an automation is ready, how does the handoff work? Does the owning team maintain it, or does it come back if something breaks?"

**Q4 — Salary:**
> "What is the salary range that you have in mind for this role?"

---

## WHY THESE QUESTIONS WORK

Each question is short enough for Robert to answer in 1-2 sentences, but secretly gives you everything you need:

| Question | What Robert says | What you get for the demo |
|---|---|---|
| "First problem you'd want me to look at?" | The specific friction point | **Your demo target** — build exactly this |
| "Current tooling?" | What systems exist, what's missing | **Tech stack for the demo** — integrate with what they have |
| "How does the handoff work?" | How polished deliverables need to be | **Quality bar** — docs, tests, or just working script? |
| "Team structure?" | Who you'd pair with | **Who your demo audience is** |

---

## SPEAKING PATTERNS TO REMEMBER

- **Short sentences.** "I built this." "Three days." "I didn't want to come empty-handed."
- **Structure with numbers.** "I have three layers." "I have four rules."
- **Honest about gaps.** "I haven't worked with that yet." "I don't know if I'm right or not."
- **Ask for time.** "Let me think for a second, please."
- **Bridge gaps.** "I haven't used X, but..." then explain what you DID build.
- **Ask questions back.** Flip to a question when stuck.
- **Never over-explain.** One pass per topic, then stop.
