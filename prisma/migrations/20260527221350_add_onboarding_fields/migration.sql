-- AlterTable
ALTER TABLE "speaking_sessions" ADD COLUMN     "isOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardedAt" TIMESTAMP(3);
