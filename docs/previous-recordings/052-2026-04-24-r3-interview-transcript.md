# Session 052 — 2026-04-24 — R3 Interview Transcript (Structured)

## Interview Details

- **Date:** Thursday 2026-04-24
- **Duration:** ~50 minutes (significant time lost to connection issues)
- **Interviewer:** Benoit Putzeys, Head of Software, Helical AI
- **Platform:** Google Meet
- **Outcome:** Advancing to R4 — in-person whiteboarding at Shoreditch office (~end of next week or early two weeks after)

---

## Structured Transcript

### 1. Benoit's Opening

**BENOIT:** Well, thank you. You get a call, and apologies for last time not having too much time.

**MANU:** No, no, no. It's okay. I understand that it was a bit overwhelming.

**BENOIT:** So, Manu, thanks again for this meeting. Before we get started, I wanted to ask if it's fine with you if I can record this meeting?

**MANU:** You can record this meeting. Yeah. That is it. I'm not going to be as sharp as I want because I'm a bit nervous, but you can record it.

**BENOIT:** No worries. That's so fun.

---

### 2. Manu's Self-Introduction

**BENOIT:** Before you start with the demo, I do want to ask if you can introduce yourself because we didn't get the time to do it last time. So maybe just a quick rundown of what you've been doing — that would be great.

**MANU:** So as I said, I studied industrial engineering in Argentina, and then I moved to Spain trying to get a master's — starting a master's. But then I met my partner in Israel. And then I moved to Israel, and I saw the high-tech there is very strong. And while I was getting the residency, I studied web development. And then what I got is a certificate as a full-stack developer.

And then I worked in a startup — a small startup called Feedback — and they were working with machine learning as well. And I was in charge to connect the back end with the front end, and they were using Python with Flask. And the front end was with React at the moment.

And then everything became a bit rushed, and I needed to move because of the war. And since then, I've been having clients, and I've been working with a few clients and building products end to end. And I've been evolving with the industry depending on the needs of the application. So if I need to use Python as a back end, and if I need to use Next.js only to build the whole back end, the front end, and AWS. So I've been evolving and learning those technologies as well. I did a few projects as you can see in my repository.

And then when the recruiter talked to me about Helical, I was very interested about your project, about what you see as the SDK. And then it's when I built this mock-up application end to end.

---

### 3. Motivation Question

**BENOIT:** Excellent. And just before you get into more technical details — why do you want to join Helical again, specifically?

**MANU:** Like, two years ago when I moved here, I saw my friend who is a neuroscientist in his thesis, comparing healthy and sick brain scans manually. So I understood — if you zoom in at that level, you can find patterns and help people. And it's exactly what, when I was researching about Helical, it's exactly what you do. Trying to really go deep and find patterns and see if the scientists with your models can find something to help people.

So that's why it got my interest. I talked to my friend as well, and I told him about what you were doing. And he gave me a clue, and he said, "Yes. It's more or less basically what I was doing in my thesis." So I want to show you I understand the product. I really like the product, and I really believe if you do it at that scale with the help of AI and machine learning, you can shorten the process and get more results.

**BENOIT:** Okay. Very good. Excellent.

---

### 4. Demo Walkthrough — Landing Page & Dashboard

**BENOIT:** Can you maybe share your screen and walk me through your demo again?

**MANU:** Okay. This is the beginning of the demo. You want me to close this?

**BENOIT:** For now, yes.

**MANU:** I fixed the disagreement model based on your feedback. And this is the explanation of the dashboard. So now we go to the dashboard.

The reference is the Geneformer single-cell model that you have. And also the GenePT model. Then the projection, which is the COVID-19 cells — you can see at the back the reference, which is the healthy dataset. And also I did the same — I used the Helical SDK running the GenePT.

The distance — it's like the distance of how those models... I don't completely fully understand what happens here, but it creates a distance between the two models on one axis and then the other axis.

**BENOIT:** That's okay.

**MANU:** And then the disagreement — the Y axis is GenePT and the X axis is Geneformer. So this is basically the mock.

---

### 5. Precomputed Pipeline Discussion

**BENOIT:** I have a few questions. Currently, it seems like all the data points are already preconfigured — but they are precomputed.

**MANU:** I did... I have an offline pipeline that I did before. And then the distance and the score, and the disagreement. So two more parquets. In my Amazon S3, I have six parquets precomputed. Because this is the part — the AI and machine learning pipeline — that I'm not really familiar with.

So here, I took the data — I loaded it — and this would be the data that the scientists want to precompute. It uses the Helical model tokenizer, then the notebook to precompute it, then reduces into coordinates — UMAP one and UMAP two — then parquet and then upload to S3.

---

### 6. Production Pipeline Question — New User Data

**BENOIT:** Good to hear. So how would you go about this if the user has new data? What are the things you have to consider — the individual steps you have to take? If the user uploads new data, for example, and needs to run this?

**MANU:** So this is how I would do it again. Get the data...

**BENOIT:** Do you mind maybe zooming in a bit?

**MANU:** Sure.

_(Manu walks through the pipeline trace visualization showing the sequential steps)_

**MANU:** And then I will add this in my Postgres — a key.

---

### 7. Connection Issues (recurring throughout)

_(Audio dropped multiple times. Video frozen. Both parties attempted camera toggles and reconnections. Significant interview time lost.)_

**MANU:** The connection is not the best. Apologies.

**BENOIT:** No worries.

_(Multiple reconnection attempts over several minutes)_

---

### 8. Notebook vs. Production — Critical Technical Exchange

**BENOIT:** So that was offline that you precomputed those parquets before and uploaded to S3. Right?

**MANU:** Yes.

**BENOIT:** So there are individual steps — for example, phase one reference, phase two projection, etcetera. These are sequential steps?

**MANU:** Exactly. Sequential steps in a Colab notebook that I have to run every time, and it needs to go to the next step until it completes all the steps and saves the parquet.

**BENOIT:** So essentially, it's just one script that you run?

**MANU:** Yes.

**BENOIT:** Okay. So here is already quite a few things which make it maybe a bit hard in production. If you go to your first cell, you can see that you install dependencies.

**MANU:** Mhmm.

**BENOIT:** So in production, is this really something you want to do on the fly, or can you think of other solutions to make this more robust?

---

### 9. Containerization Deep-Dive

**BENOIT:** Like, installing packages every time the script runs? What are the downsides of doing it this way? Why do you have a notebook instead of, say, Python files?

**MANU:** So the notebooks are for exploration and development, not production. You want the actual Python scripts or... containerize the job that runs once and computes the embeddings.

**BENOIT:** Indeed. So what I want to get at is indeed containerization. So how do you go from your notebook into a production environment? And containers to me is indeed a very good approach. Can you elaborate on this?

**MANU:** _(pauses)_ Let me think for a second, please.

**BENOIT:** No worries.

**MANU:** I would use Docker, basically.

**BENOIT:** What are the advantages?

**MANU:** Reproducibility — the same environment across machines, in isolation. It will create an environment isolated and not related with the other environments. The dependencies don't mess with your system. It's more about scalability in this case.

**BENOIT:** What about the GPU?

**MANU:** That's a good question.

**BENOIT:** Well, yeah, that's why we deploy this on the cloud because AWS comes with all the GPUs that we need. And on top of that, Docker allows you to put the GPU drivers that are required into the Docker image itself so it can accelerate the inference, training, and all of this.

**MANU:** Exactly. So Docker plus AWS will give you the scale and the flexibility that a notebook can't match.

**BENOIT:** Indeed. So if you go back to your notebook — you can specify exactly which packages you need. So if you go to the top of your file, this step is not necessary anymore because you can preinstall the required packages.

**MANU:** You're completely right. Now I understand completely the whole thing. I did this for the demo. In a real production environment, I would use Docker to create those images that will create the dependencies.

**BENOIT:** What are other advantages of using Docker? What about the GPU?

**MANU:** You have the GPUs that will allow me to do it.

**BENOIT:** It's working to some degree on Jupyter as well, but usually a Jupyter notebook can only run on one GPU. It's basically harder for that environment to distribute this on multiple GPUs.

**MANU:** Yeah. Exactly.

---

### 10. Orchestration Question

**BENOIT:** _(referring to the pipeline trace)_ So the first phase is basically loading the PBMC, making a UMAP, and creating a parquet file. And what is the second phase?

**MANU:** _(attempts to answer)_

**BENOIT:** So now we have two scripts. We have one script that prepares data, and the other essentially takes up where the other left off. So how, in production, would you do that? You have a Docker image that does one job and another Docker image which does another job. How do you execute them sequentially or in any way that you want?

**MANU:** I think this is where Airflow needs to enter the situation. Or Step Functions, or even GitHub Actions.

**BENOIT:** Have you worked with Airflow before?

**MANU:** No. I haven't worked with Airflow yet.

**BENOIT:** But roughly, can you explain what it does?

**MANU:** From what I understand, it's one of the orchestration tools, and it divides the tasks of the code. That's what I know.

**BENOIT:** _(accepts the answer — doesn't push further on Airflow specifics)_

---

### 11. AI Tools & Workflow Discussion

**BENOIT:** Just tell me about your general workflow with these new AI tools.

**MANU:** How I start is, first, defining what is the product that I want to build and what are the technologies I want to use, and define specifically what I want to build. From that part, I will have an answer about which technologies I need to use for that specific project.

From there, I start working and making decisions — comparing if it's the right decision or not. And little by little, I create a folder — like packets — and each packet creates one part of the application. And I go little by little through each part and see how it works.

You can see the flow, how I really work with them in the documentation. The pull requests. Everything is here. That's how I work with those tools. Each decision in each PR says exactly what I did.

**BENOIT:** So essentially, you tell Cursor or Claude to make this MD file itself? Or...

**MANU:** No. Not really — here is when I add or modify these files. I checked, and I see if it's completed or not.

**BENOIT:** Okay.

**MANU:** I work with branches. Each branch is a feature. And each feature has its own job.

---

### 12. Benoit's Assessment & Next Steps

**BENOIT:** Okay. I think... so this pipeline trace is essentially going to show exactly what code is being run in what sequence. Correct?

**MANU:** Correct.

**BENOIT:** And if you don't mind me asking — it does seem like quite a lot of this is generated with Cursor or Claude Code.

**MANU:** Exactly. Because when I talked to the recruiter, I explained to him — I don't know how to work with the machine learning side. And that's why I did it this way, which I understood what's happening in the meanwhile. And that's why I created this demo.

**BENOIT:** That's all good. That's all fine. I just wonder... I just want to ask how you use these AI tools.

---

### 13. Process & Logistics

**BENOIT:** Do you have questions for me at this stage?

**MANU:** My questions are more about the meeting that we'll have in person. Any clue about what it's about? I know that it's a surprise, but maybe something that could help me prepare — not in a deep...

**BENOIT:** No. You don't need to prepare. What would happen is that I present you a problem, and I want to see how you go about this problem. It's not about finding the answer. It's just about how you react in certain situations when things go wrong.

**MANU:** When is it going to be?

**BENOIT:** As soon as possible, but probably end of next week or early two weeks after.

**MANU:** Perfect then.

---

### 14. Office & Work Arrangement

**BENOIT:** Would you require a visa to work in the UK?

**MANU:** No. I have my visa already with me.

**BENOIT:** Good. And we are based in Shoreditch. Would that be fine with you?

**MANU:** Yes. It's very close to my house.

**BENOIT:** So you'd be fine to come into the office. We have a work-from-home day on Wednesday.

**MANU:** I would be very happy to go every day until I learn how the workflow is and to meet the people.

---

### 15. Closing

**BENOIT:** I'm a bit overwhelmed. But I mean, I would come back to you probably early next week. I have to discuss with the team. Usually, there would be a small coding challenge in person — like a half hour where we would meet. But I would let you know in advance.

**MANU:** You will let me know what the task is about?

**BENOIT:** You would learn about this on the day, in person.

**MANU:** Okay. Sounds good.

**BENOIT:** After that interview, you would have one or two more calls with the founders.

**MANU:** So after this, you're telling me I will have a test?

**BENOIT:** You would come to our office, and we would have an in-person whiteboarding session, let's say.

**MANU:** And you will tell me in advance what it's about, or will it be a surprise?

**BENOIT:** No. It's a surprise. You don't need to prepare.

**MANU:** Okay.

**BENOIT:** So it's nothing scary. And after that — if you pass — smaller interviews with the founders where they get to know you and talk about administrative things such as salary, etcetera. So it's nothing scary.

**MANU:** That's really nice to hear.

**BENOIT:** _(asks about AI workflow again briefly)_

**MANU:** My answers weren't so prepared, but I haven't used the technology... what you were asking me, I needed to think and process what I needed to respond.

**BENOIT:** No problem. That is fine. I wish you a very nice weekend if you don't have any questions.

**MANU:** Thank you very much.

**BENOIT:** Thank you again for your time and all the effort you put in already.

**MANU:** At least I didn't miss weekends. Thank you.

**BENOIT:** Bye bye then.

**MANU:** See you later.

---

## Key Takeaways

### What Benoit Liked

- Demo quality — didn't question the frontend/backend architecture
- Honesty about knowledge gaps ("I'm not a scientist", "I haven't worked with Airflow")
- Willingness to come to office every day initially
- The structured PR/documentation workflow

### What Benoit Probed

- **Production readiness** — notebooks vs. containerized scripts (Docker)
- **Orchestration** — how to chain sequential pipeline steps (Airflow)
- **GPU utilization** — multi-GPU distribution beyond notebook limitations
- **AI tool usage** — how much is Cursor-generated vs. hand-written

### Benoit's Key Technical Feedback

1. **Notebooks are not production** — install steps should be baked into Docker images
2. **Docker advantages**: reproducibility, isolation, scalability, GPU driver packaging, multi-GPU support
3. **Jupyter limitation**: can only run on one GPU; containers enable multi-GPU distribution
4. **Orchestration needed**: sequential Docker jobs need Airflow or similar workflow tools

### Manu's Strongest Moments

- Passion narrative about neuroscientist friend — landed naturally again
- Honest about using AI tools — "I explained to the recruiter, I don't know how to work with the ML side"
- Recovered on Docker question after asking for time to think
- Showed willingness and eagerness — "I would be very happy to go every day"

### Manu's Weakest Moments

- Couldn't elaborate on Docker GPU integration (Benoit had to explain)
- Airflow knowledge was surface-level — "it divides the tasks of the code"
- Multi-GPU distribution — didn't know the answer until Benoit explained
- Connection issues ate significant time and broke flow

### Process Revealed

1. ✅ R1 — Recruiter screen (passed)
2. ✅ R2 — 20-min technical demo (passed)
3. ✅ R3 — 50-min deep technical interview (passed — advancing)
4. ⏳ R4 — In-person whiteboarding at Shoreditch office (~30 min, surprise problem, ~2026-05-01 to 2026-05-05)
5. ⏳ R5 — Founder interviews (1-2 calls, salary/admin/culture fit)
