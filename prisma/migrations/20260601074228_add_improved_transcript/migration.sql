-- AlterTable
ALTER TABLE "transcripts" ADD COLUMN "improvedText" TEXT;
ALTER TABLE "transcripts" ADD COLUMN "wordsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[];
