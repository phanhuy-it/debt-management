-- Migration: Add BHXH adjustment indices (hệ số trượt giá) by year

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS bhxh_adjustment_indices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  factor DECIMAL(12, 6) NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bhxh_adjustment_indices_year ON bhxh_adjustment_indices(year);

DROP TRIGGER IF EXISTS update_bhxh_adjustment_indices_updated_at ON bhxh_adjustment_indices;
CREATE TRIGGER update_bhxh_adjustment_indices_updated_at BEFORE UPDATE ON bhxh_adjustment_indices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bhxh_adjustment_indices DISABLE ROW LEVEL SECURITY;

