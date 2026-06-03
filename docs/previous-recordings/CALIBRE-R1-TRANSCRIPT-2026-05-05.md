# Calibre R1 Interview Transcript — 2026-05-05

**Date:** Monday, May 5, 2026, 3:00 PM
**Duration:** ~25 minutes
**Interviewer:** Gautham Senthilnathan (CEO & Co-Founder)
**Note:** Steve Thomas (CTO) was not present in this call
**Format:** Google Meet, video call

---

## 1. Opening / Greeting (~3:00 PM)

**Gautham:** Hey. Hey. How are you?

**Manu:** I'm doing good, thanks. Yeah. Are you glad? I'm okay.

**Gautham:** Awesome.

---

## 2. Gautham's Introduction to Calibre (~3:01-3:06 PM)

**Gautham:** Cool. I'm happy to start off with a quick introduction to myself, Calibre Technologies, what we do, and then happy to... that you do a bit of an intro. Just a bit of a chat, right? Because we... not really too much of a formal interview to start with. Just kind of want to understand what you're looking for and see if there's a fit. Does that make sense?

**Manu:** Cool.

**Gautham:** So I'm Gautham. I'm one of the co-founders of Calibre. We started about seven months ago. Before that, both myself and Steve, the other co-founder, we spent three years at Palantir, building out a lot of AI stuff. I spent most of my time across healthcare, and Steve spent most of his time across banking and accounting, doing regulatory stuff. And we kind of started with the aim of revolutionizing or disrupting the certification industry. TIC as it's called -- Testing, Inspection, Certification.

Every product that you basically own has gone through certification at some point before it comes to market. Every standard -- for example, ISO standards, SOC 2 -- all of these things have to be independently verified. And with the rise of AI agents and more software and technologies, there's only more of a need to certify stuff, and the process is really slow.

There are a lot of companies working to make the process better from the company side -- helping companies get ready to be certified -- but there aren't many people working on the certification side. We wanted to come in and do the verification. So that we accelerate the audits that come in and do the third-party checks and independent verification of different standards.

We're building software across the stack -- from document review copilots to helping auditors, to voice note taking, and then meeting agents. Across basically their experience of doing an audit, we're kind of reimagining all the different parts.

We're now at full time six people. We have a couple of enterprise contracts that have just come in, and that's kind of why we're hiring -- because we just need more hands on deck to build some stuff, slightly more bespoke for enterprise clients that are in the same sector that do slightly different things in the certification space.

We'd love to learn a little bit about yourself.

---

## 3. Manu's Introduction (~3:06-3:08 PM)

**Manu:** Okay. Thanks for the introduction, and thanks for the opportunity as well. My name is Manu. I'm a full-stack developer. A little bit of my background -- I started in Argentina studying industrial engineering for a few years. Then I moved to Spain, trying to do a master's in renewable energy. But then I met my partner, and I moved to Israel. And while I was waiting for the residency, I decided to start development because Israel is one of the strongest high-tech countries in the world. So I combined my engineering skills with development. And in a year, I became a full-stack developer.

At the beginning, I started working in a startup using Python. It was a machine learning company -- before these AI tools existed -- with machine learning, Python, and React. But then everything became a bit harsh because of the war. So finding a job with a team was very challenging. So I started working as a solo engineer with a few clients. Then I moved to London, and I've been building almost six productions end to end, fully deployed, in the past three years -- it's almost been four years, actually.

And I adapted also using these AI tools, like Cursor and Claude. I use them daily. But instead of listing the productions I did, I did something for you. I created a kind of a POC, understanding the core problem. I know that auditors still manually go through the documentation and running on Excel. So I tried to create... I'm going to send you the demo because it's fully deployed -- the GitHub repository and also the API documentation. And if you like, I would be very happy to walk you through what I've done.

**Gautham:** Yeah, yeah, yeah, different. Okay. This is your landing page?

**Manu:** Yeah.

---

## 4. Demo Walkthrough (~3:08-3:12 PM)

**Manu:** And this is what I built. I tried to imitate a bit the style. So these are the technologies I use. I created a RAG system, and I took a NIST 800-53 standard as a source and injected it in the ingestion pipeline.

What it does exactly is -- the user has a question. Then two searches run in parallel: a BM25 for keyword search and a vector search for semantic search. They ranked fusion combines the results, and then Claude generates the answer in natural language with the exact citation.

So here you are -- I launched the demo. And here you have a chat. With some questions related to NIST. And if you ask a question here... it's doing this process... it answers with a proper citation. And then it tells you the match of the chunk that it collects. The chunking is clause-aware. So it tells you.

So this is the demo that I built for this interview. I didn't want to come empty-handed.

**Gautham:** Very cool.

---

## 5. Gautham's Questions About the System (~3:12-3:14 PM)

### Q: How would you make this better over time as people use the platform?

**Gautham:** In this, how do you think about making this better over time as people use the platform? And in terms of the results -- it says these clauses are matched -- how would we, over time, think about if stuff is not matching? Like, observability, tracking around that?

**Manu:** If there is a wrong answer, I would take the feedback of the auditor and then use it as a learning state so the machine learns every time -- self-improvement. And I would go over and over until I perfect the answer. Every time there is a wrong answer, I would use it as self-improvement.

---

### Q: Walk me through the AI coding -- how did you put this together?

**Gautham:** Walk me through the AI coding. So you're telling me... how do you put this together?

**Manu:** First of all, I have to say that I'm not just AI-native. Because I learned coding the hard way when the tools didn't exist. But over time, I started adapting them in my daily work. So the productivity is not because the AI can code faster. It's because I built a system around it. And so I can get the right output.

So to explain that, I have two parts. If you're open to listen about each way...

**Gautham:** Yeah, yeah.

**Manu:** Okay. First, I have three layers because I work in parallel as a team with Cursor and Claude. Claude is the architect and the supervisor. Cursor is the executor. And me, I'm the product owner, and I revise everything. This is how more or less we work as a team.

But also, I have four rules that I always follow.

The first one is -- I use a CLAUDE.md file as a constitution that I improve in each project. It has the rules, the standards, how the files have to be built, with the types.

And then the second rule that I have is called... I have an interview before it generates. Lately, I'm using something like "grill me" -- at the scale of grill me -- that asks me questions about each stage, each decision, and the trade-offs before coding. And then when I finalize this, I document everything. You can take a look at my GitHub, and everything is very well documented about the steps that I follow, the changes, the pivots that I've done.

And then the third pillar is the context window management. Because I know that after certain tokens, the context can't give me the proper answers. So I always try to keep... I have a rule -- it's like a smart context. When the context reaches forty percent, I close the session and save a file in chat sessions, and I also have a continuation prompt. In the constitution it says that every time I open a new session, it will read these files, and it will get the context of the real project.

And then the fourth one is test and validation. I use Pydantic on the backend, Zod on the frontend. And for tests, pytest on the backend, and Vitest on the frontend.

**Gautham:** Oh yeah, it's pretty cool.

---

### Q: How long did it take to build this application?

**Gautham:** And how long does it take to build something like this, this application, for you?

**Manu:** This application took me the weekend. Three days.

**Gautham:** Okay. Cool.

---

### Q: What do you enjoy doing?

**Gautham:** And is this what you enjoy? Like, building stuff from scratch, or working on your logical base? What do you enjoy doing?

**Manu:** What I enjoy doing is the challenge. The challenge of being in constant change, being in constant evolution, improving my skills, learning, being aware about what's coming. I'm not afraid about using those tools. They won't replace me. I need to understand how they work in order to use them as a tool, to gain productivity and gain quality as well. Understanding the fundamentals.

**Gautham:** Awesome. Yeah. Well, it makes sense. It's pretty exciting. Thank you for putting that together. Did you have any questions for me?

---

## 6. Manu's Questions (~3:19-3:23 PM)

### Q1: Why TIC specifically? Was there a moment at Palantir that pointed you at this industry?

**Gautham:** I spent some time in medical devices certification, and that kind of brought me into the whole certification space. And then I think more generally, I realized that there was just quite a big market in wider certification. Medical devices is very... there's a lot of liability when things go wrong. But there are a lot of other standards where, with AI making mistakes, the bar is slightly lower. And so I saw that there was a big opportunity for adjacent industries based on what I was working on.

---

### Q2: What does day-to-day look like for the first engineer? Am I pairing with you on architecture, or owning chunks independently?

**Gautham:** I think we power an architecture mainly, and we don't really go through the final detail stuff. I'm not going to tell you how to write code or your setup -- everyone does it slightly differently. But I think there are general business goals, outcomes that we need to align on, like timelines. But on that, I think we give pretty much a lot of the autonomy to get that stuff done.

We do a lot of team design reviews where you get input from other people, talk through how we're thinking about things. But yeah, we're all about learning and building out a full setup for AI coding agents to use and get faster over time.

---

### Q3: What's the biggest technical risk you see right now -- the thing that keeps you up at night about the product?

**Gautham:** I think it's probably just the fact that it's very slow to add new features at the moment -- slower than I would like -- because we only have... we have just added a second developer to the team, maybe just over a month ago.

And I think the issue now is that everyone can code, right? Everyone can create a feature, a PR. But testing that, getting it merged... basically the bottleneck has now gone from generating code to testing and merging it to production. So it's like, okay, what happens now? At one point, we had like forty-five PRs that we generated, but they all have some small issues. We all code with AI, so there's stuff that's a little bit wrong with them. But it's the -- what happens next? So you go back and make every PR perfect? Do you just merge it and then add that as an issue and solve it in the next iteration, the next sprint? I don't think that anyone has figured this out, but I think this is probably the thing that keeps me up.

**Manu:** I think this is related to the way that I use the PRs and the merges. It's like -- each feature has its own separate tasks, and I test before I create the PR. I test everything locally, and if it works and doesn't fail... so if you can take a look at my repository, maybe you will see -- all the documentation is there in each production that I've done.

**Gautham:** Yeah, I'll definitely take a look.

---

## 7. Closing (~3:24-3:25 PM)

**Gautham:** No, honestly, this has been great. I will chat with the rest of the team, review the... the other things. Probably good enough to go from that, and I'll get back to you in the next couple of days.

**Manu:** Okay. Thank you very much. Thank you so much for your time. Bye bye.

**Gautham:** Bye.

---

## Key Takeaways

### What Gautham Liked

- The POC -- "very cool," "pretty exciting," "thank you for putting that together"
- Speed of delivery -- built in a weekend, impressed by three days
- The four rules system -- "oh yeah, it's pretty cool"
- Initiative -- building something for the interview without being asked
- Documentation and PR workflow -- "I'll definitely take a look"

### What Gautham Probed

- **Observability / self-improvement** -- how would you make the system better over time as people use it
- **AI coding workflow** -- how do you actually put this together with AI tools
- **Motivation** -- what do you enjoy doing, is this what excites you

### Gautham's Key Disclosures (intel for R2)

1. **Team is now 6 people full-time** -- bigger than the "~2 engineers" from the recruiter brief
2. **Enterprise contracts just came in** -- they're hiring because of real demand, not speculative
3. **45 PRs stuck in testing/merging** -- the bottleneck has moved from code generation to quality assurance
4. **"Everyone can code now, but testing and merging is the problem"** -- this is their core engineering pain
5. **Autonomy-first culture** -- "I'm not going to tell you how to write code... we give pretty much a lot of autonomy"
6. **TIC entry via medical devices** -- Gautham's Palantir healthcare work led to certification, then widened to adjacent standards with lower liability
7. **Building across the stack** -- document review copilots, voice note taking, meeting agents, auditor tools
8. **Seamflow-style competitor awareness** -- didn't mention competitors, but the "adjacent industries" framing suggests they're positioning broader than medical devices

### Manu's Strongest Moments

- The demo walkthrough -- clear, concise, showed it working live
- "I didn't want to come empty-handed" -- landed perfectly
- Three layers + four rules explanation -- structured and confident
- "I'm not prompting and hoping" -- delivered cleanly
- Questions for Gautham -- all three were strong, especially the technical risk question which opened up the 45 PRs disclosure
- "Three days" -- short, confident, no overselling

### Manu's Weakest Moments

- Observability answer was vague -- "self-improvement" repeated without specifics (logging, retrieval scores, confidence thresholds)
- Didn't fully capitalize on the 45 PRs moment -- made the connection but didn't land the punch ("my system prevents this")
- Some verbal stumbling on "self-improvement" and "pillars" vocabulary
- "I'm not just AI-native" framing was slightly awkward in delivery

### Key Quote from Gautham (memorize for R2)

> "The bottleneck has now gone from generating code to testing and merging it to production. We had forty-five PRs that we generated, but they all have some small issues. I don't think anyone has figured this out."

**Your four rules system is the direct answer to this problem.** Lead with this in R2.

### Process So Far

1. ✅ R1 -- Founder call with Gautham (~25 min, exploratory) -- DONE
2. ⏳ R2 -- Technical interview (likely with Steve, CTO)
3. ⏳ R3 -- Third stage (TBD)

### Next Steps

- Gautham will "chat with the rest of the team" and "get back in the next couple of days"
- Steve (CTO) will likely review the GitHub repos before R2
- Daniel (recruiter) is following up for feedback

---

## END OF TRANSCRIPT
