-- Verbatim ASR + divergence fields on SpeakingSession (additive, all nullable).
ALTER TABLE "speaking_sessions" ADD COLUMN "verbatimTranscript" TEXT;
ALTER TABLE "speaking_sessions" ADD COLUMN "verbatimWordCount" INTEGER;
ALTER TABLE "speaking_sessions" ADD COLUMN "divergenceSpans" JSONB;
ALTER TABLE "speaking_sessions" ADD COLUMN "verbatimProvider" TEXT;
