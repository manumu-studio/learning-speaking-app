# Session 043 — 2026-04-21 — Interview R2 Transcript (Structured)

## Interview Details

- **Date:** Tuesday 2026-04-21, 14:30 UK time
- **Duration:** ~25 minutes
- **Interviewer:** Benoit Putzeys, Head of Software, Helical AI (first employee)
- **Platform:** Google Meet
- **Outcome:** Second call requested — Benoit wants to go through the code together

---

## Structured Transcript

### 1. Benoit's Opening (2:35 PM)

**BENOIT:** I'm happy to talk to you. Thank you for your time. I suggest that I introduce myself to you a bit about previous backgrounds, and also what Helical is doing. And then maybe you can do the same — tell me about your past experience and how we can be a fit.

---

### 2. Benoit's Self-Introduction (2:55 PM)

**BENOIT:** I have a general engineering background from Munich in Germany before doing my masters at Imperial College in sustainable energy in London. After my studies, I went to the UK Space Agency working on robotics and object detection — computer vision using AI for graphic objects and manipulating them with a rover.

The challenge there was: on one side you develop something, and then you have to make it reusable by other systems in production.

After two years, I wanted to improve my coding skills. I was working for ASML, also a Dutch company, as a software developer. There I learned the entire life cycle of code — how you go from an idea on the whiteboard to iterating on a ticket with a lot of people, estimating it in the team, and ultimately maintaining it in production.

Then two years ago, they asked me to join Helical. I was the first employee, and now I'm head of software. I've seen the product from the start.

At the beginning, I was building the open-source Helical package — it's available on GitHub. What we do there is quite simple: we abstract away base functions so that processes always know what to expect, each model interface is completely the same, etc.

After the Helical package, we developed a platform around it because we saw that everyone in computational biology tends to write good code but they stick to tools they already know. So we try to circumvent this by having a website where people can click around and use the models on specific datasets.

We are already in the second iteration of this platform. We need some help to bring up the pace and bring in more features. In general, we develop a "virtual lab" so people can use these bio foundation models in-depth and accelerate the drug discovery process.

---

### 3. Manu's Self-Introduction (2:42 PM)

**MANU:** I investigated the company a little bit before. So I was familiar with your SDK. But let me talk about myself first.

I studied in Argentina — industrial engineering — but then I met my partner in Israel. Israel is very strong in high-tech, so I studied web development. I switched. But a lot of my engineering skills helped me to understand and become a developer. I used Python and Flask at that moment.

Since then, everything became a bit harsh because of the war. I've been having clients since then — I never had the opportunity to work in a team.

But in the past few days, I built something with your SDK. I was interested because I have a neuroscientist friend that was comparing sick and healthy brain scans manually, trying to find patterns. And it's exactly what Helical does.

I understood that if you zoom in at that level, you can find patterns and you can help people. So that's why I created this interactive dashboard using two of your single-cell models — Geneformer and GenePT — comparing a healthy reference dataset against COVID immune data. I took the data from CELLxGENE.

I would be very happy to walk you through the project. I already sent you the repository, the link, and the API documentation in an email during the weekend.

---

### 4. Screen Sharing Struggle (2:45 PM)

**MANU:** I can send you the links in an email now. And I can share my screen to show you what I did.

**BENOIT:** I see everything. But maybe you want to share your screen.

**MANU:** Yes. _(struggles with screen sharing permissions)_ Now I can share the screen. Can you see it here?

**BENOIT:** Yes. I can see your screen.

---

### 5. Demo Walkthrough (2:46-2:50 PM)

**MANU:** So the dashboard — here you have the main landing page. I created an animation. I like more the light version. It tells you that you will have four views — four tabs.

I use two datasets: as a reference, the PBMC cells, which are the healthy ones. And the disease projection, which is COVID. Then an analysis. And then how the two models disagree.

I go directly to the dashboard. Here you have the embedding — it's a parquet file. I precompute in Colab, and it's saved in Amazon S3. The frontend is in Next.js, and the backend is in FastAPI. I validate with Pydantic and use PyArrow to get the parquets — there are six parquets.

This is the projection on top of the reference — the sick cells. The projection is the sick cells on top of the healthy cells, the PBMC reference.

The distance — this is what my code computes — the distance between both models.

And here I have the tab on how they disagree. Both models analyze the cells in different ways, so the results are different. Here is how they disagree, and you can find how much one disagrees with the other. This is something I also precompute with my code.

This is basically the product that I built.

---

### 6. Benoit's Reaction + Disagreement Deep-Dive (2:50-2:53 PM)

**BENOIT:** It's certainly quite impressive for a first interview to come with a fully-fetched application. So appreciate that.

A few questions then. The disagreement — what are the actual bounds?

**MANU:** _(explains the disagreement metric — distance across healthy, Geneformer and GenePT, how much the models disagree on distance)_

**BENOIT:** So I see... so each model creates a distance between its projection and the baseline?

**MANU:** Yeah.

**BENOIT:** What I see here in the graph is that we have the baseline, which is grayed out, and we have the model representation — colorful.

**MANU:** Yes.

**BENOIT:** Obviously, not one-to-one. So we can calculate the distance between the two.

**MANU:** Yeah. My code takes both and compares the absolute difference.

**BENOIT:** I would have expected to see a binary label in your disagreement. So one is the distance of GPT and one is the distance of Geneformer.

**MANU:** I tried... I'm not a scientist, so this is what I got from the idea of comparing. I don't know if I'm right or not. I'm just trying to show you how I used the SDK.

**BENOIT:** That's all good. That's all good. I think this is quite nice.

---

### 7. Technology Question (2:54-2:56 PM)

**BENOIT:** Can you tell me what you used in order to make this plot interactive? Which technologies are used? I'm interested in the underlying — how the frontend receives the data.

**MANU:** First, you create a GET request here. It goes to — first, it's an HTTPS request. It goes to Nginx that decrypts the request to HTTP and goes directly to FastAPI. FastAPI validates with Pydantic the data — what I'm asking.

Then this endpoint goes to... _(shows the API docs)_ ...a table. Not tables. So according to what I ask, I will get this output. It will look for this specific parquet in S3. Then when I get the parquet, PyArrow selects 5,000 rows of data, Pydantic validates again the data and puts it in a JSON file, and then Zod validates in the frontend. And then Plotly shows the embedding.

---

### 8. Benoit's Closing + Second Call Request (2:57 PM)

**BENOIT:** Apologies. I have another meeting now, but I suggest that we can have another 20-minute call, ideally tomorrow. I really appreciate you taking the time and building already a small mock-up. I don't want your efforts to go to waste, so I propose that we have another quick 20-minute interview if that is okay with you.

**MANU:** It's okay for me.

**BENOIT:** What do you use? _(referring to something on screen — possibly Plotly/JSON)_ Okay. Very nice. Excellent. Then I'll send you my link, and then we can catch up hopefully very soon.

**MANU:** Okay. Just let me know when.

**BENOIT:** I will let you know. Thank you. Bye bye.

**MANU:** See you then.

---

## Key Takeaways

### What Benoit Liked

- "Quite impressive for a first interview to come with a fully-fetched application"
- "I don't want your efforts to go to waste" — he values what Manu built
- Asked to schedule a second call — clear interest

### What Benoit Wants Next

- **Go through the code together** — he'll likely open the GitHub repo
- **2-3 more questions** — probably about frontend data flow (he started asking but ran out of time)

### Benoit's Feedback on Disagreement Tab

- Expected to see **two separate distances** (one per model), not a combined disagreement score
- Manu was honest: "I'm not a scientist" — Benoit accepted that gracefully

### What Manu Did Well

- Friend story landed naturally
- Architecture explanation was clear (HTTPS → Nginx → FastAPI → Pydantic → S3 → PyArrow → Zod → Plotly)
- Honest about limitations — didn't pretend to know biology
- Showed the live deployed app on his own domain

### What to Improve

- Screen sharing setup — have it ready before the call
- Pronounce model names clearly (Geneformer, GenePT)
- Prepare deeper code walkthrough for next call

### About Benoit (for context)

- Engineering background from Munich, masters at Imperial College London
- UK Space Agency (robotics, computer vision)
- ASML (software development lifecycle)
- First employee at Helical, now Head of Software
- Built the open-source Helical SDK
- Building a "virtual lab" platform — second iteration, needs help with pace and features
