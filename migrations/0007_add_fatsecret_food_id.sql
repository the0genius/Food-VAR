ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "fatsecret_food_id" text;
DROP INDEX IF EXISTS "products_barcode_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_source_idx" ON "products" ("barcode", "source");
