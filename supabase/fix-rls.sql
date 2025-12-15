-- Script để fix Row Level Security (RLS) issue
-- Chạy script này trong Supabase SQL Editor nếu gặp lỗi RLS

-- Option 1: Tắt RLS hoàn toàn (khuyến nghị cho personal app)
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses DISABLE ROW LEVEL SECURITY;

-- Option 2: Bật RLS và tạo policies cho phép tất cả operations
-- (Uncomment nếu muốn dùng RLS)
-- ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- DROP existing policies nếu có
DROP POLICY IF EXISTS "Allow all operations on loans" ON loans;
DROP POLICY IF EXISTS "Allow all operations on credit_cards" ON credit_cards;
DROP POLICY IF EXISTS "Allow all operations on fixed_expenses" ON fixed_expenses;

-- Tạo policies mới cho phép tất cả operations
CREATE POLICY "Allow all operations on loans" ON loans 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on credit_cards" ON credit_cards 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on fixed_expenses" ON fixed_expenses 
  FOR ALL USING (true) WITH CHECK (true);

