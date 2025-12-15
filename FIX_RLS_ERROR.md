# Cách Fix Lỗi Row Level Security (RLS)

## Lỗi:
```
new row violates row-level security policy for table "loans"
```

## Nguyên nhân:
Supabase đang bật Row Level Security (RLS) nhưng chưa có policies cho phép insert/update/delete.

## Giải pháp (Chọn 1 trong 2):

### Option 1: Tắt RLS (Khuyến nghị cho app cá nhân)

1. Vào Supabase Dashboard
2. Vào **SQL Editor**
3. Chạy script sau:

```sql
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses DISABLE ROW LEVEL SECURITY;
```

4. Click **Run**

### Option 2: Tạo Policies để cho phép tất cả operations

1. Vào Supabase Dashboard
2. Vào **SQL Editor**
3. Chạy script sau:

```sql
-- Bật RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- Tạo policies
CREATE POLICY "Allow all operations on loans" ON loans 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on credit_cards" ON credit_cards 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on fixed_expenses" ON fixed_expenses 
  FOR ALL USING (true) WITH CHECK (true);
```

4. Click **Run**

### Hoặc dùng file đã chuẩn bị:

Chạy file `supabase/fix-rls.sql` trong SQL Editor.

---

## Sau khi fix:

1. Thử import lại file backup
2. Nếu thành công, bạn sẽ thấy log: `✅ Đã lưu vào Supabase database`

## Lưu ý:

- **Option 1** (tắt RLS): Đơn giản hơn, phù hợp cho app cá nhân
- **Option 2** (tạo policies): Bảo mật hơn, có thể tùy chỉnh sau

