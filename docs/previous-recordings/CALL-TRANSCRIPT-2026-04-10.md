# Call Transcript — 2026-04-10

> **Source:** Phone conversation between Manu and a PhD neuroscientist friend, recorded and transcribed automatically. Audio quality was poor for long stretches — the friend sounded far away, the microphone cut in and out, and the call dropped entirely toward the end. What follows is a cleaned, readable English reconstruction, not a verbatim transcript. Where the audio degraded beyond recovery, the text is paraphrased from surrounding context and flagged inline.

## Framing

This call was prompted by an external recruiter reaching out to Manu about a technical role at **Helical AI**, a European biotech startup building foundation models for single-cell biology. Manu wanted to ground his understanding of the company's work in real scientific practice, so he called his closest friend — a neuroscientist whose PhD involved exactly the kind of "healthy vs. sick, extract features, classify" analysis that Helical's models now automate, but in the imaging domain rather than single-cell genomics.

The goal of the call was two-fold: (1) check whether Manu's analogy between the friend's thesis methodology and Helical's pipeline actually held up, and (2) hear, in the friend's own words, why a working scientist finds this field worth dedicating a career to.

## Cleaned summary

### How the call started

Manu opened by explaining that he had not applied to Helical directly — an external talent firm had approached him on the company's behalf. He was candid with the recruiter up front: he has no formal machine-learning background beyond the fundamentals, and his strength is software engineering. The recruiter told him that the most common reason candidates fail the introductory interview is not technical weakness but a lack of visible, genuine interest in the biology itself. That framing is what prompted this call.

To explain what Helical does, Manu used the friend's own thesis as a reference point: *"Remember those thousands of brain images you used to analyze — healthy versus diseased — where you'd look at them from multiple angles, pull out vectors for each region, feed them into statistical models, and end up with a signal that separated one group from the other? Helical does that same thing, but on individual cells instead of brain scans, and using modern AI foundation models instead of classical regressions."* The friend confirmed that the analogy held up.

### The friend's answer to "why work in biotech at all?"

The friend gave a two-part answer, and it is worth preserving both parts carefully because they became the scientific spine of the project.

**1. Fundamental curiosity about how the brain — and by extension, biological systems — actually work.** Whether you are part of a large collaboration or running a small independent project, research gives you access to questions about how the organ you study really operates, at a level of detail and speed that was unreachable a decade ago. The motivation, in his words, is *"understanding how the mind works — having real access to how the mind works."* That is the intrinsic pull.

**2. Cascading medical applications.** Understanding how the brain works is never just about curing a single disease. Every genuine insight into how a biological system functions propagates outward into other branches of medicine and clinical practice. *"We can generate applications that serve other fields, especially medical and clinical ones."* This is what makes the field so high-leverage: you are not solving one problem, you are producing tools and insights that unlock many downstream problems at once.

### What the call did not cover

Because the audio degraded steadily and the call eventually dropped, several topics on Manu's original question list went unanswered:

- No specific dataset recommendations.
- No confirmation of whether the friend had worked directly with AnnData or single-cell RNA-seq — his thesis was in neuroimaging, a different data modality.
- No concrete "wow" story of an AI model finding something in biological data that a human would have missed.
- No technical critique of Manu's project ideas, since he had not yet presented any.

A follow-up text message was sent immediately after the call to cover the missed items. See `FRIEND-QUESTIONS.md`.

## Reconstructed conversation

The exchange below is a smoothed English version of what was said. It is not a verbatim transcript — it is a readable reconstruction that preserves the real meaning of each speaker's turns.

**Manu:** Okay, you're on. Let me tell you what this is about. A company reached out to me — well, technically a talent firm working on their behalf. I never sent them a CV; they found me. It's a biotech startup, and the way I want to explain what they do is by using your thesis.

You remember all those thousands of brain images you worked with — healthy versus diseased — where you'd look at each one from different angles, pull out features mathematically, run linear regressions and other statistical models, and end up with a vector per region that let you classify one brain against another? Are you following me?

**Friend:** Yeah, yeah, go on — I can hear you now, before you sounded far away.

**Manu:** Good. So basically, this company does the exact same idea, just not in neuroscience. It's at the biological level more broadly — single cells, DNA, RNA. Instead of you designing the features by hand and running regressions, they have pre-trained machine-learning models that keep training on new data and produce the output directly. That's the core of what they do.

So the interview I have coming up is essentially them wanting to check one thing: whether I genuinely want to work in this field. Apparently, most candidates fail at that exact point. And since you are the one person I know who has actually done this kind of sick-versus-healthy, vector-based analysis in a real research setting — what would *you* say if someone asked you why anyone should want to work in biotech?

[Audio degraded — paraphrased from context.]

**Friend:** Alright — number one, for me, whether you do it as part of a big collaboration or as an independent line of research, what pulls you in is that you can actually start answering questions about how the brain works. That's the thing that has always motivated me personally. Getting closer to how that organ operates, getting real access to its mechanisms, at a level of resolution that simply wasn't possible before. That's reason one: the curiosity is genuine, and it's about the mind itself.

Number two — and this is almost more important from the outside — is that once you understand how the brain works, or how any biological system works, you can generate applications that carry over into other fields. Especially medical and clinical fields. You are never just solving one disease. The understanding propagates. That is why the payoff of this kind of work compounds: you are building tools and insights that unlock many downstream problems.

So, to sum it up: reason one is pure curiosity about how the mind works, reason two is that the applications cascade outward into medicine and clinical practice. Those are the two things that kept me in it.

**Manu:** Thank you, that is exactly the kind of answer I needed. Let me tell you a bit more about the situation so you understand where I'm coming from.

The technical side I already have covered — I'm a software engineer, I know Python, I can build an application on top of whatever stack they are using. The gap I have is machine learning. I told the recruiter that directly: I have no formal ML background, only the fundamentals, and everything else I've picked up from experience. The recruiter said that was fine for this stage — my profile matched the other requirements well enough that he was going to pass me along to the hiring manager.

What caught my attention is that they hired an external talent firm specifically to find people like me. They've raised a serious amount of money, the team is strong, and they are early-stage but already have real clients. The recruiter couldn't even tell me the company name at first, until it was confirmed. And when he finally did, and I looked them up, I realized: this is exactly the kind of methodology you were doing by hand — except now they have a library of pre-trained models that handle the heavy lifting.

[Audio degraded — paraphrased from context. Microphone failed shortly after this point and the call ended.]

## Key insight

The scientific spine of the project came out of this call: the friend's thesis methodology (build a template from healthy samples, define subtypes, compare a new sample against that template, and measure where and how it diverges) maps almost one-to-one onto the pipeline Helical's SDK makes possible with single-cell RNA-seq data.

In the friend's thesis, the pipeline was:
1. Collect many images from healthy brains.
2. Build a reference template / atlas.
3. Take a new (possibly diseased) brain, project it into that reference.
4. Measure divergence at the voxel or region level.
5. Ask which regions drive the classification.

In a Helical-style pipeline with a model like Geneformer, the same structure is:
1. Collect many single-cell expression profiles from healthy donors.
2. Embed them with a pre-trained foundation model to build a reference manifold.
3. Take cells from a diseased donor, embed them with the same model, project into the reference.
4. Measure divergence at the per-cell or per-cell-type level.
5. Ask which genes or cell states drive the divergence.

The data modality is completely different — voxels versus transcripts — but the conceptual shape is identical: a reference built from healthy data, a projection of a new sample into that reference, and a measurement of where it diverges. This is the idea that anchors the demo project's design.
