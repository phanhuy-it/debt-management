# Hướng dẫn Migration Database cho Investment Accounts & Transactions

## Tổng quan

Cấu trúc database đã được thay đổi từ bảng `investments` đơn lẻ sang 2 bảng:
- `investment_accounts`: Lưu thông tin các khoản đầu tư (tên, status, notes)
- `investment_transactions`: Lưu các giao dịch nạp/rút tiền (liên kết với account qua `account_id`)

## Các bước Migration

### Bước 1: Chạy Migration SQL

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy và chạy nội dung file `migration_investment_accounts_transactions.sql`

Hoặc chạy qua CLI:
```bash
psql -h [your-db-host] -U [your-user] -d [your-database] -f supabase/migration_investment_accounts_transactions.sql
```

### Bước 2: Kiểm tra Migration

Sau khi chạy migration, kiểm tra:

```sql
-- Kiểm tra số lượng accounts
SELECT COUNT(*) FROM investment_accounts;

-- Kiểm tra số lượng transactions
SELECT COUNT(*) FROM investment_transactions;

-- Kiểm tra dữ liệu đã được migrate đúng chưa
SELECT 
  ia.name,
  COUNT(it.id) as transaction_count,
  SUM(CASE WHEN it.type = 'DEPOSIT' THEN it.amount ELSE 0 END) as total_deposit,
  SUM(CASE WHEN it.type = 'WITHDRAW' THEN it.amount ELSE 0 END) as total_withdraw
FROM investment_accounts ia
LEFT JOIN investment_transactions it ON ia.id = it.account_id
GROUP BY ia.id, ia.name;
```

### Bước 3: Xóa bảng cũ (Tùy chọn)

**CHỈ XÓA SAU KHI ĐÃ XÁC NHẬN MỌI THỨ HOẠT ĐỘNG ĐÚNG!**

```sql
-- Backup trước khi xóa (khuyến nghị)
CREATE TABLE investments_backup AS SELECT * FROM investments;

-- Xóa bảng cũ
DROP TABLE IF EXISTS investments;
```

## Cấu trúc bảng mới

### investment_accounts
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL) - Tên khoản đầu tư
- `status` (TEXT) - ACTIVE hoặc COMPLETED
- `notes` (TEXT, nullable) - Ghi chú
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### investment_transactions
- `id` (UUID, Primary Key)
- `account_id` (UUID, Foreign Key -> investment_accounts.id)
- `type` (TEXT) - DEPOSIT hoặc WITHDRAW
- `amount` (DECIMAL)
- `date` (DATE)
- `status` (TEXT) - ACTIVE hoặc COMPLETED
- `note` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Tương thích ngược

Code đã được cập nhật để:
1. Ưu tiên load từ bảng mới (`investment_accounts` và `investment_transactions`)
2. Nếu bảng mới chưa tồn tại, sẽ fallback về bảng cũ (`investments`)
3. Tự động migrate dữ liệu từ bảng cũ sang bảng mới khi load lần đầu

## Lưu ý

- Migration script sẽ tự động tạo accounts từ các tên đầu tư unique trong bảng cũ
- Tất cả transactions sẽ được liên kết với account tương ứng
- Bảng cũ `investments` được giữ lại để tương thích ngược, có thể xóa sau khi xác nhận mọi thứ hoạt động tốt

