-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'SCORING';

-- CreateTable
CREATE TABLE "pronunciation_reports" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pronScore" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "fluencyScore" DOUBLE PRECISION NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL,
    "prosodyScore" DOUBLE PRECISION NOT NULL,
    "speakingRateWpm" DOUBLE PRECISION NOT NULL,
    "azureLocale" TEXT NOT NULL DEFAULT 'en-US',
    "azureSdkVersion" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pronunciation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_pronunciations" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "wordIndex" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "errorType" TEXT NOT NULL,
    "offsetMs" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "breakErrorTypes" TEXT[],
    "intonationErrorTypes" TEXT[],
    "monotonePitchDelta" DOUBLE PRECISION,
    "phonemes" JSONB NOT NULL,
    "l1Tags" TEXT[],

    CONSTRAINT "word_pronunciations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pronunciation_reports_sessionId_key" ON "pronunciation_reports"("sessionId");

-- CreateIndex
CREATE INDEX "pronunciation_reports_sessionId_idx" ON "pronunciation_reports"("sessionId");

-- CreateIndex
CREATE INDEX "word_pronunciations_reportId_wordIndex_idx" ON "word_pronunciations"("reportId", "wordIndex");

-- CreateIndex
CREATE INDEX "word_pronunciations_reportId_errorType_idx" ON "word_pronunciations"("reportId", "errorType");

-- AddForeignKey
ALTER TABLE "pronunciation_reports" ADD CONSTRAINT "pronunciation_reports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_pronunciations" ADD CONSTRAINT "word_pronunciations_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "pronunciation_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
