# Hướng dẫn Setup Supabase

## Bước 1: Tạo Supabase Project

1. Đăng ký/đăng nhập tại [supabase.com](https://supabase.com)
2. Tạo project mới:
   - Click **"New Project"**
   - Điền thông tin:
     - **Name**: debt-management (hoặc tên bạn muốn)
     - **Database Password**: Chọn mật khẩu mạnh (lưu lại, sẽ cần sau)
     - **Region**: Chọn region gần bạn nhất
   - Click **"Create new project"**
   - Đợi project được khởi tạo (khoảng 1-2 phút)

## Bước 2: Lấy API Keys

1. Vào **Settings** (biểu tượng bánh răng ở sidebar bên trái)
2. Chọn **API**
3. Copy 2 giá trị sau:
   - **Project URL** (ví dụ: `https://xxxxx.supabase.co`)
   - **anon public** key (trong phần **Project API keys**)

## Bước 3: Tạo Database Schema

1. Vào **SQL Editor** (trong sidebar)
2. Click **"New query"**
3. Copy toàn bộ nội dung từ file `supabase/schema.sql`
4. Paste vào SQL Editor
5. Click **"Run"** (hoặc Ctrl+Enter)
6. Bạn sẽ thấy thông báo thành công và 3 bảng được tạo:
   - `loans`
   - `credit_cards`
   - `fixed_expenses`

## Bước 4: Cấu hình Environment Variables

1. Tạo file `.env` ở thư mục root (nếu chưa có):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Lưu ý**: 
- Thay `https://your-project.supabase.co` bằng Project URL của bạn
- Thay `your-anon-key-here` bằng anon public key của bạn
- File `.env` đã được ignore trong `.gitignore`, không lo lộ thông tin

2. Nếu deploy lên Vercel, thêm các biến môi trường này trong Vercel Dashboard:
   - Project Settings → Environment Variables
   - Thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`

## Bước 5: Kiểm tra

1. Chạy ứng dụng:
```bash
npm run dev
```

2. Mở browser console và kiểm tra:
   - Nếu thấy `✅ Đã lưu vào Supabase database` → Thành công!
   - Nếu thấy cảnh báo về credentials → Kiểm tra lại `.env`

3. Vào Supabase Dashboard → **Table Editor** để xem dữ liệu đã được lưu

## Cấu hình Row Level Security (Tùy chọn)

Theo mặc định, schema đã comment RLS. Nếu muốn bật bảo mật:

1. Vào **Authentication** → **Policies**
2. Tạo policies cho mỗi bảng để cho phép:
   - SELECT (đọc)
   - INSERT (thêm)
   - UPDATE (sửa)
   - DELETE (xóa)

Hoặc nếu muốn public access (cho app cá nhân), giữ nguyên như hiện tại (RLS tắt).

## Troubleshooting

### Lỗi: "Invalid API key"
- Kiểm tra lại `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `.env`
- Đảm bảo không có khoảng trắng thừa
- Restart dev server sau khi sửa `.env`

### Lỗi: "relation does not exist"
- Kiểm tra lại đã chạy SQL schema chưa
- Vào Table Editor xem có 3 bảng chưa

### Dữ liệu không lưu được
- Kiểm tra Network tab trong browser DevTools
- Xem có lỗi CORS không
- Kiểm tra RLS policies nếu đã bật

## Migrate dữ liệu từ localStorage

Ứng dụng sẽ tự động migrate dữ liệu từ localStorage sang Supabase khi:
- Bạn lần đầu load app với Supabase đã được cấu hình
- Database trống nhưng localStorage có dữ liệu

Sau khi migrate, dữ liệu sẽ được lưu trong Supabase và có thể truy cập từ bất kỳ đâu!

