-- Migration: Split investments table into investment_accounts and investment_transactions
-- Run this script to migrate from old investments structure to new structure

-- Step 1: Create investment_accounts table
CREATE TABLE IF NOT EXISTS investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create investment_transactions table
CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAW')),
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_investment_accounts_status ON investment_accounts(status);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_account_id ON investment_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_status ON investment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(type);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(date);

-- Step 4: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_investment_accounts_updated_at ON investment_accounts;
CREATE TRIGGER update_investment_accounts_updated_at BEFORE UPDATE ON investment_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investment_transactions_updated_at ON investment_transactions;
CREATE TRIGGER update_investment_transactions_updated_at BEFORE UPDATE ON investment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Disable Row Level Security (or enable if needed)
ALTER TABLE investment_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions DISABLE ROW LEVEL SECURITY;

-- Step 6: Migrate data from old investments table to new structure
-- This will create accounts from unique investment names and link transactions
DO $$
DECLARE
  investment_record RECORD;
  account_id_var UUID;
  account_name_var TEXT;
BEGIN
  -- Loop through all investments and group by name
  FOR investment_record IN 
    SELECT DISTINCT name, status 
    FROM investments 
    ORDER BY name
  LOOP
    -- Create account for each unique investment name
    INSERT INTO investment_accounts (id, name, status, notes, created_at, updated_at)
    SELECT 
      uuid_generate_v4(),
      investment_record.name,
      investment_record.status,
      NULL,
      MIN(created_at),
      MAX(updated_at)
    FROM investments
    WHERE name = investment_record.name
    GROUP BY name, status
    ON CONFLICT DO NOTHING
    RETURNING id INTO account_id_var;
    
    -- If account was created, get its ID
    IF account_id_var IS NULL THEN
      SELECT id INTO account_id_var 
      FROM investment_accounts 
      WHERE name = investment_record.name 
      LIMIT 1;
    END IF;
    
    -- Migrate all transactions for this account
    INSERT INTO investment_transactions (id, account_id, type, amount, date, status, note, created_at, updated_at)
    SELECT 
      id,
      account_id_var,
      type,
      amount,
      date,
      status,
      note,
      created_at,
      updated_at
    FROM investments
    WHERE name = investment_record.name;
  END LOOP;
END $$;

-- Step 7: Optional - Drop old investments table after migration
-- Uncomment the line below ONLY after verifying the migration was successful
-- DROP TABLE IF EXISTS investments;

-- Note: The old investments table is kept for backward compatibility
-- You can drop it later after confirming everything works correctly

