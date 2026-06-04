-- AlterTable — add verbatim transcript fields to chunk_results for per-chunk AssemblyAI transcription
ALTER TABLE "chunk_results" ADD COLUMN "verbatimText" TEXT;
ALTER TABLE "chunk_results" ADD COLUMN "verbatimWords" JSONB;
