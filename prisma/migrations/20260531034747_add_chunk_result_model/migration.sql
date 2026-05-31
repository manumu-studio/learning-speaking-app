-- CreateEnum
CREATE TYPE "ChunkResultStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "chunk_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "status" "ChunkResultStatus" NOT NULL DEFAULT 'PENDING',
    "durationSecs" DOUBLE PRECISION NOT NULL,
    "overlapSecs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transcriptText" TEXT,
    "wordCount" INTEGER,
    "words" JSONB,
    "pronunciationReport" JSONB,
    "insights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chunk_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chunk_results_sessionId_chunkIndex_key" ON "chunk_results"("sessionId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "chunk_results" ADD CONSTRAINT "chunk_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
