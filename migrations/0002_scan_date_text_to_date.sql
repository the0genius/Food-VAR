DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_scan_tracker'
      AND column_name = 'scan_date'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE "daily_scan_tracker" ALTER COLUMN "scan_date" TYPE date USING "scan_date"::date;
  END IF;
END $$;
