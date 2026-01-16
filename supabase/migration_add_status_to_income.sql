-- Migration: Add status column to income table if it doesn't exist
-- This migration ensures backward compatibility with older databases

-- Check if status column exists, if not, add it
DO $$
BEGIN
    -- Check if the status column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'income' 
        AND column_name = 'status'
    ) THEN
        -- Add status column with default value 'ACTIVE'
        ALTER TABLE income 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'COMPLETED'));
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_income_status ON income(status);
        
        RAISE NOTICE 'Added status column to income table';
    ELSE
        RAISE NOTICE 'Status column already exists in income table';
    END IF;
END $$;
