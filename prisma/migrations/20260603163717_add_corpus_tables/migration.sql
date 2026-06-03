-- CreateTable
CREATE TABLE "lexemes" (
    "id" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "pos" TEXT,
    "freqPerMillion" DOUBLE PRECISION,
    "spokenFreqPerM" DOUBLE PRECISION,
    "rank" INTEGER,
    "zipf" DOUBLE PRECISION,
    "cefr" TEXT,
    "sfi" DOUBLE PRECISION,
    "source" TEXT NOT NULL,

    CONSTRAINT "lexemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collocations" (
    "id" TEXT NOT NULL,
    "headLemma" TEXT NOT NULL,
    "headPos" TEXT,
    "collocate" TEXT NOT NULL,
    "collocatePos" TEXT,
    "relation" TEXT,
    "freq" INTEGER,
    "mi" DOUBLE PRECISION,
    "logDice" DOUBLE PRECISION,
    "tScore" DOUBLE PRECISION,
    "source" TEXT NOT NULL,

    CONSTRAINT "collocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multi_word_expressions" (
    "id" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "lemmaKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "freq" DOUBLE PRECISION,
    "spokenFreq" DOUBLE PRECISION,
    "writtenFreq" DOUBLE PRECISION,
    "ftw" DOUBLE PRECISION,
    "cefr" TEXT,
    "senseNote" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "multi_word_expressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lexemes_lemma_idx" ON "lexemes"("lemma");

-- CreateIndex
CREATE UNIQUE INDEX "lexemes_lemma_pos_source_key" ON "lexemes"("lemma", "pos", "source");

-- CreateIndex
CREATE INDEX "collocations_headLemma_idx" ON "collocations"("headLemma");

-- CreateIndex
CREATE INDEX "collocations_headLemma_collocate_idx" ON "collocations"("headLemma", "collocate");

-- CreateIndex
CREATE UNIQUE INDEX "collocations_headLemma_collocate_source_key" ON "collocations"("headLemma", "collocate", "source");

-- CreateIndex
CREATE INDEX "multi_word_expressions_lemmaKey_idx" ON "multi_word_expressions"("lemmaKey");

-- CreateIndex
CREATE INDEX "multi_word_expressions_canonical_idx" ON "multi_word_expressions"("canonical");

-- CreateIndex
CREATE UNIQUE INDEX "multi_word_expressions_canonical_type_source_key" ON "multi_word_expressions"("canonical", "type", "source");

-- Enable pg_trgm for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for fuzzy lookups
CREATE INDEX "lexemes_lemma_trgm_idx" ON "lexemes" USING gin ("lemma" gin_trgm_ops);
CREATE INDEX "collocations_headLemma_trgm_idx" ON "collocations" USING gin ("headLemma" gin_trgm_ops);
CREATE INDEX "collocations_collocate_trgm_idx" ON "collocations" USING gin ("collocate" gin_trgm_ops);
CREATE INDEX "multi_word_expressions_canonical_trgm_idx" ON "multi_word_expressions" USING gin ("canonical" gin_trgm_ops);
