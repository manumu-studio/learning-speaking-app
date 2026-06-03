-- CreateTable
CREATE TABLE "daily_conclusions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conclusionJson" JSONB NOT NULL,
    "renderedFeedback" TEXT NOT NULL,
    "topicSentence" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "totalDurationSecs" INTEGER NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "deliveryAvg" DOUBLE PRECISION NOT NULL,
    "languageAvg" DOUBLE PRECISION NOT NULL,
    "pronunciationAvg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "daily_conclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_conclusions_userId_createdAt_idx" ON "daily_conclusions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_conclusions_userId_date_key" ON "daily_conclusions"("userId", "date");

-- AddForeignKey
ALTER TABLE "daily_conclusions" ADD CONSTRAINT "daily_conclusions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
