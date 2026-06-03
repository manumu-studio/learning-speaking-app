# R3 Interview Transcript — 2026-04-24 — Manu & Benoit

**Duration:** ~50 minutes
**Format:** Video call (significant connection issues throughout)
**Recording:** Benoit recorded with Manu's consent

---

## Part 1: Introduction

**Benoit:** Well, thank you. You get a call, and apologies for last time not having too much time.

**Manu:** No, no, no. It's okay. I understand that it was a bit overwhelming.

**Benoit:** So, Manu, thanks again for this meeting. Before we get started, I wanted to ask if it's fine with you if I can record this meeting?

**Manu:** You can record this meeting. Yeah. I'm not going to be as sharp as I want because I'm a bit nervous, but you can record it.

**Benoit:** No worries, that's fine. Before you start with the demo, I do want to ask if you can introduce yourself because we didn't get the time to do it last time. So maybe just a quick rundown of what you've been doing — that would be great.

**Manu:** So as I said, I studied industrial engineering in Argentina, and then I moved to Spain trying to get a master's, starting a master's. But then I met my partner in Israel, and then I moved to Israel, and I saw the high-tech there is very strong. And while I was getting the residency, I studied web development. And then what I got is a certificate as a full stack developer. And then I worked in a startup, a small startup called Feedback, and they were working with machine learning as well. And I was in charge to connect the back end with the front end, and they were using Python with Flask, and the front end was with React at the moment. And then everything became a bit rushed, and I needed to move because of the war. And since then, I've been having clients, and I've been working with a few clients and building products end to end. And I've been evolving with the industry depending on the needs of the application. So if I need to use Python as a back end, and if I need to use Next.js only to build the whole back end, the front end and AWS. So I've been evolving and learning those technologies as well. So I did a few projects, as you can see in my repository. And then when the recruiter talked to me about Helical, I was very interested about your project, about what you see as the SDK. And then it's when I built this mock-up application end to end.

**Benoit:** Excellent. And just before you get into more details, technical details — why do you want to join Helical again specifically?

**Manu:** Like two years ago when I moved here, I saw my friend who is a neuroscientist in his thesis, comparing healthy and sick brain scans manually. So I understood, if you zoom in at that level, you can find patterns and help people. And it's exactly what — when I was researching about Helical, it's exactly what you do. Trying to really go deep and find patterns and see if the scientist with your models can find something to help people. So that's why it got my interest. So I talked to my friend as well, and I told him about what you were doing. And he gave me a clue, and he said, yes, it's more or less basically what I was doing in my thesis. So I want to show you I can understand the product. I really like the product, and I really believe if you do it at that scale with the help of AI and machine learning, you can shorten the processing and get more results.

**Benoit:** Okay. Very good. Excellent. Can you maybe share your screen and walk me through your demo again?

---

## Part 2: Demo Walkthrough

**Manu:** This is the landing page. As you can see, it shows you and explains the four views — what you are going to have in each tab. My application is made for GET requests. This is a runtime API.

So we have four tabs here. The reference, the projections, the distance, and the disagreement.

The reference is the Geneformer single cell model that you have. And also the GenePT model that you have. So then the projection, which is the COVID nineteen cells — you can see at the back the reference, which is a healthy sample, the healthy dataset. And also I did the same, I used the Helical SDK running the GenePT.

The distance — I don't completely fully understand what happens here, but it creates a distance between the two models. And then in one axis and the other axis, and it creates a number here. I don't fully understand because I'm not a scientist.

**Benoit:** That's okay.

**Manu:** And then the disagreement, which is y-axis I have the GenePT and the x-axis I have Geneformer. So this is basically the mock.

**Benoit:** Alright. I have a few questions. Currently, it seems like all the data points are already preconfigured?

**Manu:** They are precomputed. I have an offline pipeline that I did before. This is the distance and the score. And then the disagreement. So two more parquet files. So in my Amazon S3, I have six parquet files precomputed. Because this is the part — the AI and machine learning pipeline — that I'm not really familiar with. So here I took the data, I load this, and this would be the data that the scientists want to precompute. It uses the Helical model tokenizer, then the notebook to precompute it, then reduces into coordinates — UMAP one and UMAP two — then parquet, then upload to S3.

**Benoit:** Good to hear. So how would you go about this if the user has new data? What are the things you have to consider for the individual steps you have to take? If the user uploads new data, for example?

**Manu:** So this is how I would do it again. Get the data...

**Benoit:** Do you mind maybe zooming in a bit?

**Manu:** Sure.

---

## Part 3: Pipeline Discussion

**Benoit:** So you ran this locally probably first and you uploaded this to the server, which then accesses the data displayed. Right?

**Manu:** Yes. I downloaded the data from CellxGene. I took two datasets — the PBMC3k, which is the healthy reference, and then the COVID dataset. Then I used a Colab notebook. I don't have a GPU to run those because it's a lot of data, so I rented a Colab notebook. And then I used two of your models from the SDK — Geneformer and GenePT.

That gave me four parquet files. Then my code computed the distance and the scores and the disagreement. So I had two more parquet files. So in total, I have now six parquet files, which is what you can see that pulls for each request.

**Benoit:** So there are individual steps, for example, phase one reference, phase two projection, etcetera. Let's say you have steps. So in phase one, you have — if you can click there — in production, how would this actually be executed in production?

**Manu:** These are sequence of steps. It's a sequence of everything — sequential steps in a Colab notebook that I have to run every time, and it needs to go to the next step until it completed all the steps and be able to save the parquet.

**Benoit:** So essentially, it's just one script that you run?

**Manu:** Yes.

**Benoit:** Okay. Not robust. What do you mean with robust?

**Manu:** Because if I run this every time each request, it will take much more time. So that's why I precomputed before.

**Benoit:** Indeed. That is a nice demo, but in production, the question is, how do you do this in production? A notebook is essentially a scripting environment. So it's probably not the best solution to have production code run in a notebook.

**Manu:** The notebooks are for exploration and development, not production. So you want the actual Python scripts or — containerize the job that runs once and computes the embeddings.

**Benoit:** Indeed. So what I want to get at is indeed containerization. So how do you go from your notebook into a production environment? And containers to me is indeed a very good approach. Can you elaborate on this?

**Manu:** Let me think for a second, please.

**Benoit:** No worries. What — why should you do this? What are the advantages? And how can you use this in production?

**Manu:** I will use Docker, basically.

---

## Part 4: Docker & Containerization Deep Dive

**Manu:** So Docker packages everything — all the dependencies, the code. Reproducibility — the same environment across machines, in isolation. It will create an environment isolated, and it's not related with the other environments. The dependencies don't mess with your system. It's more about scalability in this case.

**Benoit:** What about the GPU?

**Manu:** That's a good question.

**Benoit:** Well, yeah, that's why we deploy this on the cloud because AWS comes with all the GPUs that we need. And on top of that, Docker allows you to put the GPU drivers that are required into the Docker image itself so it can accelerate the inference, training, and all of this.

**Manu:** Exactly. Docker plus AWS will give you the scale and the flexibility that a notebook can't match.

**Benoit:** So what I never seem to see is — you can specify exactly which packages you need. So if you go at the top of your file, this step is not necessary anymore because you can preinstall the required packages.

**Manu:** You're completely right. Now I understand completely the whole thing. I did this for the demo. In real production, I would use Docker to create those images that will create the dependencies, and that's it. I won't have this step.

**Benoit:** What are other advantages of using Docker? What about the GPU?

**Manu:** You have the GPUs that will allow me to do it.

**Benoit:** It's working to some degree on Jupyter as well, but usually a Jupyter notebook can only run on one GPU. It's basically harder for that environment to distribute this on multiple GPUs.

**Manu:** Yeah, exactly.

---

## Part 5: Orchestration

**Benoit:** Can you go back to your pipeline? So the first phase is basically loading the PBMC, make a UMAP, and bake a file out of it — parquet or PyArrow, whatever. And what is the second phase?

**Manu:** *(navigating)*

**Benoit:** So now we have two scripts. We have one script that prepares data, and the other essentially takes up where the other left off. So how — in production again, would you do that? You have a Docker image that does one job and another Docker image which does another job. How do you execute them sequentially or in any way that you want?

**Manu:** Orchestration. I think Airflow needs to enter in this situation. The Step Functions or even GitHub Actions.

**Benoit:** Have you worked with Airflow before?

**Manu:** No, I haven't worked with Airflow yet. But roughly — from what I understand, it's one of the orchestration tools, and it divides the tasks of the code. That's what I know.

**Benoit:** Okay. That's fine.

---

## Part 6: AI Tools & Workflow

**Benoit:** Just tell me about your general workflow with these new AI tools.

**Manu:** How I start is, first, defining what is the product that I want to build and what are the technologies I want to use, and define specifically what I want to build. And from that, I will have an answer about which technologies I need to use for that specific project. And from there, I start working and making decisions — if they're the right decisions or not, comparing. And little by little, I create a folder called packets, and each packet creates one part of the application. And I go little by little through each part and see how it works. You can see the flow in the documentation — the pull requests. Everything is here. That's how I work with those tools. Each decision in each PR says exactly what I did.

**Benoit:** So essentially, you tell Cursor or Claude to make this MD file itself?

**Manu:** Not really, because here is when I add or modify these files. I check and see if it's completed or not.

**Manu:** I work with branches. Each branch is a feature. And each feature has its own job. *(navigating to show build packets)*

---

## Part 7: Logistics & Next Steps

**Benoit:** I do have two smaller questions. Would you require a visa to work in the UK?

**Manu:** No. I have my visa already with me.

**Benoit:** Good. And we are based in Shoreditch. Would that be fine with you?

**Manu:** It's very close to my house.

**Benoit:** So you're willing to come into the office? We have a work from home day Wednesday.

**Manu:** I would be very happy to go every day until I learn how the workflow is and to meet the people.

**Benoit:** I would come back to you probably early next week. I have to discuss with the team. Usually, there would be a small coding challenge in person, like a half an hour where we would meet. But I would let you know, obviously, in advance.

**Manu:** You will let me know what it's about?

**Benoit:** You would learn about this on the day, in person.

**Manu:** Okay. Sounds good. And after that interview, what happens?

**Benoit:** After that, you would have one or two more calls with the founders where they get to know you and talk about administrative things such as salary, etcetera. So it's nothing scary.

**Manu:** So that's really nice to hear. Really, really nice to hear. Any clue about what the whiteboarding is about? I know that it's a surprise, but maybe something that helps me prepare?

**Benoit:** No. You don't need to prepare. It's just that what would happen is that I present you a problem, and I want to see how you go about this problem. How you go about solving it. It's not about finding the answer. It's just about how you react in certain situations when things go wrong.

**Manu:** When is it going to be?

**Benoit:** As soon as possible, but probably end of next week or early two weeks after.

**Manu:** Perfect then.

**Benoit:** And we're thanking you again for your time and all the effort you put in already.

**Manu:** Thank you very much. At least you didn't miss weekends — I had a lot to do during the weekend, so that's why I put this meeting at the end of the week.

**Benoit:** No worries. All good. Alright. Bye bye then.

**Manu:** Bye bye. See you later.

---

## Key Takeaways

### What Benoit tested:
1. **Self-introduction** — background, motivation, why Helical
2. **Demo walkthrough** — can you explain your own work clearly
3. **Production thinking** — notebooks vs containers, Docker advantages
4. **Orchestration knowledge** — how to chain pipeline steps
5. **AI tool workflow** — how you use Cursor/Claude, what's yours vs generated
6. **GPU awareness** — how containers access GPUs, multi-GPU distribution

### Benoit's key statements:
- "Notebooks are essentially a scripting environment — not the best for production"
- "Containers to me is indeed a very good approach"
- "A Jupyter notebook can only run on one GPU — harder to distribute on multiple GPUs"
- "I present you a problem, and I want to see how you go about this problem"
- "It's not about finding the answer — it's about how you react when things go wrong"
- "You don't need to prepare"

### Next steps confirmed:
- In-person whiteboarding session at Helical office (Shoreditch)
- Timeline: end of next week or early two weeks after (~May 1-5)
- 30-minute coding/whiteboarding challenge — surprise problem
- After that: 1-2 founder interviews (salary, culture fit)
