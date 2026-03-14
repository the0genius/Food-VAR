-- Add headline and coach_tip columns to advice_cache for full UI field consistency
ALTER TABLE "advice_cache" ADD COLUMN IF NOT EXISTS "headline" text;
ALTER TABLE "advice_cache" ADD COLUMN IF NOT EXISTS "coach_tip" text;
