-- Migration: Add investments table
-- Run this script to add the investments table to your existing database

-- Investments Table (Đầu tư)
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAW')),
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security (RLS) for public access
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;

-- Alternative: Nếu muốn bật RLS, uncomment các dòng sau:
-- ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on investments" ON investments 
--   FOR ALL USING (true) WITH CHECK (true);

