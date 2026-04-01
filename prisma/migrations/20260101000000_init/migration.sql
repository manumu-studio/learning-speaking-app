-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ConsentFlag" AS ENUM ('AUDIO_STORAGE', 'TRANSCRIPT_STORAGE', 'PATTERN_TRACKING');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('CREATED', 'UPLOADED', 'TRANSCRIBING', 'ANALYZING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "public"."insights" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "frequency" INTEGER,
    "severity" TEXT,
    "examples" JSONB,
    "suggestion" TEXT,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."metric_snapshots" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pattern_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patterns" JSONB NOT NULL,
    "focusAreas" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pattern_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."speaking_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'CREATED',
    "durationSecs" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "topic" TEXT,
    "promptUsed" TEXT,
    "audioUrl" TEXT,
    "audioDeletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "focusNext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "intentLabel" TEXT,
    "location" TEXT,
    "focusMetricKey" TEXT,

    CONSTRAINT "speaking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transcripts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flag" "public"."ConsentFlag" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insights_sessionId_idx" ON "public"."insights"("sessionId" ASC);

-- CreateIndex
CREATE INDEX "metric_snapshots_sessionId_idx" ON "public"."metric_snapshots"("sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_sessionId_key_key" ON "public"."metric_snapshots"("sessionId" ASC, "key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pattern_profiles_userId_key" ON "public"."pattern_profiles"("userId" ASC);

-- CreateIndex
CREATE INDEX "speaking_sessions_userId_createdAt_idx" ON "public"."speaking_sessions"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_sessionId_key" ON "public"."transcripts"("sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_userId_flag_key" ON "public"."user_consents"("userId" ASC, "flag" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_externalId_key" ON "public"."users"("externalId" ASC);

-- AddForeignKey
ALTER TABLE "public"."insights" ADD CONSTRAINT "insights_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."metric_snapshots" ADD CONSTRAINT "metric_snapshots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pattern_profiles" ADD CONSTRAINT "pattern_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."speaking_sessions" ADD CONSTRAINT "speaking_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcripts" ADD CONSTRAINT "transcripts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."speaking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
