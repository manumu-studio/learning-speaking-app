-- AlterTable
ALTER TABLE "speaking_sessions" ADD COLUMN     "registerFeedback" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "estimatedCefrLevel" TEXT;

-- CreateTable
CREATE TABLE "user_words" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "cefrLevel" TEXT NOT NULL DEFAULT 'b2',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenSessionId" TEXT,

    CONSTRAINT "user_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_words_userId_cefrLevel_idx" ON "user_words"("userId", "cefrLevel");

-- CreateIndex
CREATE INDEX "user_words_userId_firstSeenAt_idx" ON "user_words"("userId", "firstSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_words_userId_word_key" ON "user_words"("userId", "word");

-- AddForeignKey
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_firstSeenSessionId_fkey" FOREIGN KEY ("firstSeenSessionId") REFERENCES "speaking_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
