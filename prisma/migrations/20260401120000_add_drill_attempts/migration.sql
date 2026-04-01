-- CreateTable
CREATE TABLE "drill_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "drillType" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sourceExample" TEXT,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "feedback" TEXT,
    "improved" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "drill_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drill_attempts_userId_createdAt_idx" ON "drill_attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "drill_attempts_sessionId_idx" ON "drill_attempts"("sessionId");

-- AddForeignKey
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drill_attempts" ADD CONSTRAINT "drill_attempts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "speaking_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
