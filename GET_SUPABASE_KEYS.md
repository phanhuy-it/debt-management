# Cách lấy Supabase API Keys cho Frontend

## Bước 1: Vào Supabase Dashboard

1. Đăng nhập vào [supabase.com](https://supabase.com)
2. Chọn project của bạn (tên project có thể chứa "ziuaisolotuzjiyeelvh")

## Bước 2: Lấy Project URL và API Key

1. Click vào **Settings** (biểu tượng bánh răng ở sidebar bên trái)
2. Click vào **API** trong menu Settings
3. Bạn sẽ thấy:

### Project URL
Tìm phần **Project URL**, sẽ có dạng:
```
https://ziuaisolotuzjiyeelvh.supabase.co
```
(hoặc tương tự, domain có thể khác)

### API Keys
Trong phần **Project API keys**, tìm key có label là **anon** hoặc **public**:

```
anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Bước 3: Cấu hình trong .env

Tạo hoặc cập nhật file `.env` ở thư mục root với thông tin trên:

```env
VITE_SUPABASE_URL=https://ziuaisolotuzjiyeelvh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Lưu ý**: 
- Thay URL và key bằng giá trị thực tế của bạn
- File `.env` đã được gitignore, không lo lộ thông tin
- Restart dev server sau khi cập nhật `.env`

## Kiểm tra

Sau khi cấu hình xong, chạy:
```bash
npm run dev
```

Mở browser console, nếu thấy log `✅ Đã lưu vào Supabase database` khi bạn thêm/sửa dữ liệu → Thành công!

---

## Thông tin Database Connection (cho server-side - không cần cho frontend)

Thông tin bạn đã cung cấp:
```
host: aws-1-ap-southeast-2.pooler.supabase.com
port: 6543
database: postgres
user: postgres.ziuaisolotuzjiyeelvh
pass: 9qVjnb59MdwXo6B9
```

**Lưu ý**: Thông tin này chỉ dùng cho:
- Server-side code (Node.js backend)
- Database clients (pgAdmin, DBeaver, etc.)
- Direct PostgreSQL connections

**KHÔNG CẦN** thông tin này cho frontend React app. Frontend chỉ cần Project URL và Anon Key như hướng dẫn trên.

