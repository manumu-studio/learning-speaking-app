-- Fix lexeme.pos: coalesce NULLs to empty string, deduplicate, make NOT NULL

-- Step 1: Drop unique index so updates don't conflict
DROP INDEX IF EXISTS "lexemes_lemma_pos_source_key";

-- Step 2: Set all NULL pos values to empty string
UPDATE "lexemes" SET "pos" = '' WHERE "pos" IS NULL;

-- Step 3: Delete duplicate rows (keep the one with the lowest id)
DELETE FROM "lexemes" a
USING "lexemes" b
WHERE a."lemma" = b."lemma"
  AND a."pos" = b."pos"
  AND a."source" = b."source"
  AND a."id" > b."id";

-- Step 4: Make pos NOT NULL with default
ALTER TABLE "lexemes" ALTER COLUMN "pos" SET NOT NULL;
ALTER TABLE "lexemes" ALTER COLUMN "pos" SET DEFAULT '';

-- Step 5: Re-create unique index
CREATE UNIQUE INDEX "lexemes_lemma_pos_source_key" ON "lexemes"("lemma", "pos", "source");
