# Hướng dẫn Deploy

## Kiến trúc hệ thống

Ứng dụng bao gồm 2 phần:
- **Frontend**: React app chạy trên Vite (port 3000)
- **Backend**: Express API server (port 3001) để lưu trữ dữ liệu vào file JSON

## Cài đặt và chạy local

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` (hoặc copy từ `.env.example`):
```env
GEMINI_API_KEY=your_api_key_here
VITE_API_URL=http://localhost:3001
```

### 3. Chạy ứng dụng

**Cách 1: Chạy cả frontend và backend cùng lúc** (Khuyên dùng cho development)
```bash
npm run dev:all
```

**Cách 2: Chạy riêng lẻ**

Terminal 1 - Backend:
```bash
npm run dev:server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### 4. Truy cập ứng dụng

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Deploy lên Production

### Option 1: Deploy cùng một server (VPS/Cloud)

#### Bước 1: Build frontend
```bash
npm run build
```

#### Bước 2: Cấu hình backend để serve static files

Cập nhật `server/index.js` để serve file tĩnh:
```javascript
import express from 'express';
// ... existing code ...

// Serve static files từ thư mục dist
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback về index.html cho React Router (nếu có)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

#### Bước 3: Chạy với PM2 (khuyến nghị)

```bash
npm install -g pm2
pm2 start server/index.js --name debt-management
pm2 save
pm2 startup
```

### Option 2: Deploy tách biệt

#### Frontend (Vercel/Netlify):
1. Build frontend: `npm run build`
2. Deploy thư mục `dist`
3. Cấu hình biến môi trường:
   - `VITE_API_URL=https://your-backend-domain.com`

#### Backend (VPS/Railway/Render):
1. Upload thư mục `server` và file `package.json`
2. Cài đặt dependencies: `npm install --production`
3. Tạo thư mục `data` và cấp quyền ghi
4. Chạy: `npm start` hoặc dùng PM2
5. Cấu hình reverse proxy (nginx) nếu cần

### Cấu hình Nginx (nếu deploy trên VPS)

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/debt-management/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Lưu ý

1. **Bảo mật**: 
   - Không commit file `.env` và `data/database.json`
   - Sử dụng HTTPS trong production
   - Cân nhắc thêm authentication cho API

2. **Backup dữ liệu**:
   - File database được lưu tại `data/database.json`
   - Nên setup backup tự động cho file này

3. **Environment Variables**:
   - `GEMINI_API_KEY`: API key cho tính năng AI advisor
   - `VITE_API_URL`: URL của backend API (mặc định: http://localhost:3001)
   - `PORT`: Port cho backend server (mặc định: 3001)

## Troubleshooting

- **Lỗi CORS**: Đảm bảo backend đã cài đặt và cấu hình `cors` middleware
- **Không lưu được dữ liệu**: Kiểm tra quyền ghi vào thư mục `data/`
- **API không kết nối được**: Kiểm tra biến môi trường `VITE_API_URL` có đúng không

