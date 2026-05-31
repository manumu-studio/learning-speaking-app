-- CreateTable
CREATE TABLE "vocab_suggestions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "exampleSentence" TEXT NOT NULL,
    "suggestedInSessionId" TEXT NOT NULL,
    "firstUsedInSessionId" TEXT,
    "firstUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocab_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vocab_suggestions_userId_firstUsedInSessionId_idx" ON "vocab_suggestions"("userId", "firstUsedInSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "vocab_suggestions_userId_word_key" ON "vocab_suggestions"("userId", "word");

-- AddForeignKey
ALTER TABLE "vocab_suggestions" ADD CONSTRAINT "vocab_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_suggestions" ADD CONSTRAINT "vocab_suggestions_suggestedInSessionId_fkey" FOREIGN KEY ("suggestedInSessionId") REFERENCES "speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_suggestions" ADD CONSTRAINT "vocab_suggestions_firstUsedInSessionId_fkey" FOREIGN KEY ("firstUsedInSessionId") REFERENCES "speaking_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
