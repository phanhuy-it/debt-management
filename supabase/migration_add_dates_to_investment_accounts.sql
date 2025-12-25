-- Migration: Add start_date and end_date columns to investment_accounts table
-- Run this script if you already have investment_accounts table and want to add date fields

-- Add start_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_accounts' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE investment_accounts ADD COLUMN start_date DATE;
  END IF;
END $$;

-- Add end_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_accounts' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE investment_accounts ADD COLUMN end_date DATE;
  END IF;
END $$;

-- Optional: Set start_date to created_at for existing records if start_date is null
UPDATE investment_accounts 
SET start_date = DATE(created_at) 
WHERE start_date IS NULL;

