-- CreateEnum
CREATE TYPE "TimedFluencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "timed_fluency_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "status" "TimedFluencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timed_fluency_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timed_fluency_rounds" (
    "id" TEXT NOT NULL,
    "fluencySessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "speakingSessionId" TEXT,
    "speechRateWpm" DOUBLE PRECISION,
    "fillerCount" INTEGER,
    "hesitationCount" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timed_fluency_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timed_fluency_sessions_userId_createdAt_idx" ON "timed_fluency_sessions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "timed_fluency_rounds_speakingSessionId_key" ON "timed_fluency_rounds"("speakingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "timed_fluency_rounds_fluencySessionId_roundNumber_key" ON "timed_fluency_rounds"("fluencySessionId", "roundNumber");

-- CreateIndex
CREATE INDEX "timed_fluency_rounds_fluencySessionId_idx" ON "timed_fluency_rounds"("fluencySessionId");

-- AddForeignKey
ALTER TABLE "timed_fluency_sessions" ADD CONSTRAINT "timed_fluency_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timed_fluency_rounds" ADD CONSTRAINT "timed_fluency_rounds_fluencySessionId_fkey" FOREIGN KEY ("fluencySessionId") REFERENCES "timed_fluency_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timed_fluency_rounds" ADD CONSTRAINT "timed_fluency_rounds_speakingSessionId_fkey" FOREIGN KEY ("speakingSessionId") REFERENCES "speaking_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
