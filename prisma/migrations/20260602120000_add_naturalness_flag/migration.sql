-- CreateTable
CREATE TABLE "naturalness_flags" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalPhrase" TEXT NOT NULL,
    "suggestedPhrase" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "collocationMetric" TEXT,
    "metricValue" DOUBLE PRECISION,
    "l1TransferSource" TEXT,
    "rationale" TEXT NOT NULL,
    "shownToUser" BOOLEAN NOT NULL DEFAULT true,
    "userFeedback" TEXT,

    CONSTRAINT "naturalness_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "naturalness_flags_sessionId_idx" ON "naturalness_flags"("sessionId");

-- CreateIndex
CREATE INDEX "naturalness_flags_userId_createdAt_idx" ON "naturalness_flags"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "naturalness_flags" ADD CONSTRAINT "naturalness_flags_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "naturalness_flags" ADD CONSTRAINT "naturalness_flags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
