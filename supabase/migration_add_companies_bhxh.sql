-- Migration: Add companies & BHXH monthly records

-- Enable UUID extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly salary / BHXH base records per company
CREATE TABLE IF NOT EXISTS company_income_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- format: "YYYY-MM"
  net_salary DECIMAL(15, 2),
  bhxh_base DECIMAL(15, 2),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_income_records_company_id ON company_income_records(company_id);
CREATE INDEX IF NOT EXISTS idx_company_income_records_month ON company_income_records(month);

-- Triggers
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_income_records_updated_at ON company_income_records;
CREATE TRIGGER update_company_income_records_updated_at BEFORE UPDATE ON company_income_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS for simplicity (match current project defaults)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_income_records DISABLE ROW LEVEL SECURITY;

