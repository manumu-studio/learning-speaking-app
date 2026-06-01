-- AlterTable
ALTER TABLE "vocab_suggestions" ADD COLUMN     "domain" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "frequencyBand" TEXT NOT NULL DEFAULT 'mid',
ADD COLUMN     "interval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "nextReviewAt" TIMESTAMP(3),
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'word';

-- CreateIndex
CREATE INDEX "vocab_suggestions_userId_nextReviewAt_idx" ON "vocab_suggestions"("userId", "nextReviewAt");

-- Backfill: set nextReviewAt for existing rows so they enter the review queue
UPDATE "vocab_suggestions"
SET "nextReviewAt" = "createdAt" + INTERVAL '1 day'
WHERE "nextReviewAt" IS NULL;
