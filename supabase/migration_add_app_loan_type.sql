-- Migration: Add APP loan type to loans table
-- Date: 2025-01-XX
-- Description: Update loans table to support APP loan type in addition to BANK and PERSONAL

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_type_check;

-- Step 2: Add new CHECK constraint that includes APP
ALTER TABLE loans ADD CONSTRAINT loans_type_check CHECK (type IN ('BANK', 'APP', 'PERSONAL'));

-- Verify the change
-- You can run this query to check: SELECT DISTINCT type FROM loans;

