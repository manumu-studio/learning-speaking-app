-- Add chunked recording support: SessionChunk model and SpeakingSession chunk fields
CREATE TYPE "ChunkStatus" AS ENUM ('UPLOADED', 'TRANSCRIBING', 'SCORING', 'CHUNK_DONE', 'FAILED');

ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'CHUNKS_PROCESSING';

ALTER TABLE "speaking_sessions" ADD COLUMN "isChunked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "speaking_sessions" ADD COLUMN "chunkCount" INTEGER;

CREATE TABLE "session_chunks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "status" "ChunkStatus" NOT NULL DEFAULT 'UPLOADED',
    "durationSecs" INTEGER NOT NULL,
    "overlapSecs" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "audioUrl" TEXT,
    "audioDeletedAt" TIMESTAMP(3),
    "transcriptText" TEXT,
    "words" JSONB,
    "wordCount" INTEGER,
    "pronScore" DOUBLE PRECISION,
    "accuracyScore" DOUBLE PRECISION,
    "fluencyScore" DOUBLE PRECISION,
    "completenessScore" DOUBLE PRECISION,
    "prosodyScore" DOUBLE PRECISION,
    "speakingRateWpm" DOUBLE PRECISION,
    "pronWords" JSONB,
    "pronRawJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_chunks_sessionId_chunkIndex_key" ON "session_chunks"("sessionId", "chunkIndex");
CREATE INDEX "session_chunks_sessionId_status_idx" ON "session_chunks"("sessionId", "status");

ALTER TABLE "session_chunks" ADD CONSTRAINT "session_chunks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
