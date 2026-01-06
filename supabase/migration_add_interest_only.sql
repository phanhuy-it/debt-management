-- Migration: Add interest_only field to loans table
-- Date: 2025-01-XX
-- Description: Add interest_only column to support loans that only pay interest (principal doesn't decrease)

-- Step 1: Add the column if it doesn't exist
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS interest_only BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing records (optional - set to FALSE for existing loans)
-- UPDATE loans SET interest_only = FALSE WHERE interest_only IS NULL;

-- Verify the change
-- You can run this query to check: SELECT id, name, interest_only FROM loans LIMIT 10;

