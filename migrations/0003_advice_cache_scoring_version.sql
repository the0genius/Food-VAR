-- Add scoringVersion to advice_cache for version-aware cache lookups
ALTER TABLE "advice_cache" ADD COLUMN IF NOT EXISTS "scoring_version" text;

-- Add extractionConfidence to products for per-field confidence tracking
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "extraction_confidence" jsonb;
