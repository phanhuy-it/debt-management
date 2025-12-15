# Hướng dẫn Deploy lên Vercel

## ⚠️ Lưu ý quan trọng

**Vercel là serverless platform** - không hỗ trợ persistent file system. Do đó, bạn **KHÔNG THỂ** lưu dữ liệu vào file JSON như cách hiện tại khi deploy trên Vercel.

## Giải pháp được đề xuất

### Option 1: Deploy Frontend trên Vercel + Backend riêng (Khuyến nghị)

#### Bước 1: Deploy Backend lên Railway/Render/Fly.io

**Railway (Khuyến nghị - miễn phí cho personal use):**

1. Đăng ký tài khoản tại [railway.app](https://railway.app)
2. Tạo project mới từ GitHub repository
3. Cấu hình:
   - **Root Directory**: `/` (hoặc để trống)
   - **Build Command**: Không cần (backend không cần build)
   - **Start Command**: `npm start`
4. Railway sẽ tự động tạo persistent volume cho thư mục `data/`
5. Lấy URL backend (ví dụ: `https://your-app.railway.app`)

**Hoặc Render.com:**

1. Đăng ký tại [render.com](https://render.com)
2. Tạo **Web Service** mới
3. Kết nối GitHub repository
4. Cấu hình:
   - **Build Command**: (để trống)
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Lấy URL backend

#### Bước 2: Deploy Frontend lên Vercel

1. **Cài đặt Vercel CLI** (nếu chưa có):
```bash
npm i -g vercel
```

2. **Deploy**:
```bash
vercel
```

Hoặc kết nối GitHub repository với Vercel Dashboard.

3. **Cấu hình Environment Variables** trên Vercel:
   - Vào Project Settings → Environment Variables
   - Thêm: `VITE_API_URL=https://your-backend-url.com` (URL từ Railway/Render)

4. **Cập nhật `vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-url.com/api/:path*"
    }
  ]
}
```

Thay `https://your-backend-url.com` bằng URL backend thực tế của bạn.

---

### Option 2: Chuyển sang sử dụng Database (Nâng cao)

Nếu muốn deploy toàn bộ trên Vercel, bạn cần chuyển sang dùng database:

**Các lựa chọn:**
- **Vercel Postgres** (tích hợp sẵn với Vercel)
- **MongoDB Atlas** (miễn phí tier)
- **Supabase** (miễn phí tier)

Sau đó cần refactor code để:
- Thay thế file system operations bằng database queries
- Sử dụng Vercel Serverless Functions thay vì Express server
- Cập nhật `fileService.ts` để gọi database thay vì file system

**Lưu ý**: Option này đòi hỏi nhiều thay đổi code hơn.

---

### Option 3: Deploy toàn bộ trên VPS/Cloud Server

Nếu có VPS hoặc Cloud Server (AWS EC2, DigitalOcean, v.v.):

1. Clone repository
2. Cài đặt dependencies: `npm install`
3. Build frontend: `npm run build`
4. Chạy với PM2: `pm2 start server/index.js --name debt-management`
5. Cấu hình Nginx để serve frontend và proxy API

Xem chi tiết trong file `DEPLOY.md`

---

## So sánh các phương án

| Phương án | Chi phí | Độ khó | Persistent Storage | Khuyến nghị |
|-----------|---------|--------|-------------------|-------------|
| Vercel + Railway | Miễn phí | Dễ | ✅ Có | ⭐⭐⭐⭐⭐ |
| Vercel + Database | Miễn phí | Khó | ✅ Có | ⭐⭐⭐ |
| VPS/Cloud | Trả phí | Trung bình | ✅ Có | ⭐⭐⭐⭐ |

---

## Quick Start với Railway

1. Đăng ký Railway: https://railway.app
2. New Project → Deploy from GitHub repo
3. Chọn repo và deploy
4. Railway tự động detect `package.json` và chạy `npm start`
5. Lấy URL từ Settings → Networking → Generate Domain
6. Update `VITE_API_URL` trong Vercel environment variables
7. Redeploy Vercel

---

## Kiểm tra sau khi deploy

1. ✅ Frontend load được trên Vercel
2. ✅ API endpoint hoạt động: `https://your-backend.com/api/health`
3. ✅ Có thể tạo/sửa/xóa dữ liệu
4. ✅ Dữ liệu được lưu vào file trong thư mục `data/` trên backend server

