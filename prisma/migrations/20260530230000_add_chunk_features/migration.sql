-- CreateTable
CREATE TABLE "chunk_features" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "frameMs" INTEGER NOT NULL DEFAULT 10,
    "f0Hz" DOUBLE PRECISION[],
    "intensityDb" DOUBLE PRECISION[],
    "voiced" BOOLEAN[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunk_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chunk_features_sessionId_chunkIndex_key" ON "chunk_features"("sessionId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "chunk_features" ADD CONSTRAINT "chunk_features_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
