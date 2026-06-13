-- CreateTable
CREATE TABLE "golden_sessions" (
    "id" TEXT NOT NULL,
    "sourceSessionId" TEXT,
    "cleanTranscript" TEXT NOT NULL,
    "verbatimTranscript" TEXT,
    "pronunciationSummary" TEXT,
    "azureRawJson" JSONB,
    "promptUsed" TEXT,
    "focusMetricKey" TEXT,
    "stratum" TEXT NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "golden_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "golden_labels" (
    "id" TEXT NOT NULL,
    "goldenId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "humanScore" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "isRetest" BOOLEAN NOT NULL DEFAULT false,
    "rubricVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "golden_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judge_runs" (
    "id" TEXT NOT NULL,
    "goldenId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "aiScore" INTEGER NOT NULL,
    "modelPin" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "runIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judge_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "golden_sessions_stratum_idx" ON "golden_sessions"("stratum");

-- CreateIndex
CREATE INDEX "golden_labels_goldenId_metric_idx" ON "golden_labels"("goldenId", "metric");

-- CreateIndex
CREATE INDEX "judge_runs_goldenId_metric_modelPin_promptHash_idx" ON "judge_runs"("goldenId", "metric", "modelPin", "promptHash");

-- AddForeignKey
ALTER TABLE "golden_labels" ADD CONSTRAINT "golden_labels_goldenId_fkey" FOREIGN KEY ("goldenId") REFERENCES "golden_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_runs" ADD CONSTRAINT "judge_runs_goldenId_fkey" FOREIGN KEY ("goldenId") REFERENCES "golden_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

