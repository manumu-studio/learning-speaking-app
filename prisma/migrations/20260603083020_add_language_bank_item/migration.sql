-- CreateTable
CREATE TABLE "language_bank_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "lemmaOrPattern" TEXT,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "masteryState" TEXT NOT NULL DEFAULT 'emerging',
    "isActiveTarget" BOOLEAN NOT NULL DEFAULT false,
    "firstSuggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "lastSuggestedAt" TIMESTAMP(3),
    "nextRetargetAt" TIMESTAMP(3),

    CONSTRAINT "language_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "language_bank_items_userId_masteryState_idx" ON "language_bank_items"("userId", "masteryState");

-- CreateIndex
CREATE INDEX "language_bank_items_userId_isActiveTarget_idx" ON "language_bank_items"("userId", "isActiveTarget");

-- CreateIndex
CREATE UNIQUE INDEX "language_bank_items_userId_text_key" ON "language_bank_items"("userId", "text");

-- AddForeignKey
ALTER TABLE "language_bank_items" ADD CONSTRAINT "language_bank_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
