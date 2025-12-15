-- Supabase Database Schema cho Debt Management App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BANK', 'PERSONAL')),
  original_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  monthly_due_date INTEGER CHECK (monthly_due_date >= 1 AND monthly_due_date <= 31),
  monthly_payment DECIMAL(15, 2) DEFAULT 0,
  start_date DATE,
  term_months INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  notes TEXT,
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Cards Table
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_debt DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_amount DECIMAL(15, 2) DEFAULT 0,
  due_date INTEGER NOT NULL CHECK (due_date >= 1 AND due_date <= 31),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  notes TEXT,
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fixed Expenses Table
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  due_date INTEGER NOT NULL CHECK (due_date >= 1 AND due_date <= 31),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  notes TEXT,
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_type ON loans(type);
CREATE INDEX IF NOT EXISTS idx_credit_cards_status ON credit_cards(status);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_status ON fixed_expenses(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_expenses_updated_at BEFORE UPDATE ON fixed_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security (RLS) for public access
-- Nếu muốn bật RLS, comment các dòng ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
-- và uncomment các CREATE POLICY ở dưới

ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses DISABLE ROW LEVEL SECURITY;

-- Alternative: Nếu muốn bật RLS, uncomment các policy sau:
-- ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow all operations on loans" ON loans 
--   FOR ALL USING (true) WITH CHECK (true);
-- 
-- CREATE POLICY "Allow all operations on credit_cards" ON credit_cards 
--   FOR ALL USING (true) WITH CHECK (true);
-- 
-- CREATE POLICY "Allow all operations on fixed_expenses" ON fixed_expenses 
--   FOR ALL USING (true) WITH CHECK (true);

