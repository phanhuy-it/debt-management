# Triển khai

Frontend Vite và backend Express được triển khai riêng. Neon chỉ được truy cập
từ backend; không đặt `DATABASE_URL` hoặc `APP_PASSWORD` vào biến `VITE_*`.

## Backend (Railway / Render)

1. Tạo Node web service từ repository, cài dependencies bằng `npm install`,
   chạy `npm start`.
2. Cấu hình biến môi trường riêng tư:
   - `DATABASE_URL`: chuỗi kết nối Neon với TLS và xác thực chứng chỉ.
   - `APP_PASSWORD`: mật khẩu ngẫu nhiên tối thiểu 20 ký tự.
   - `FRONTEND_ORIGIN`: origin HTTPS chính xác của frontend, ví dụ
     `https://app.example.com` (không có đường dẫn hoặc dấu `/` cuối).
   - `NODE_ENV=production`.
3. Bật HTTPS, lưu URL của backend và đảm bảo backend có thể kết nối Neon.
   Các bảng nghiệp vụ trong `public` phải có sẵn; backend chỉ tự tạo bảng
   phiên đăng nhập và bảng đánh dấu giao dịch đầu tư cũ đã chuyển. Xem
   [README.md](./README.md) để kiểm tra và chuyển dữ liệu cũ trước khi chạy.
   Giới hạn quyền truy cập database và không dựa vào RLS nếu các bảng đang
   tắt RLS.

## Frontend (Vercel)

1. Trong `vercel.json`, thay `https://your-backend-url.com` bằng URL HTTPS
   thực tế của backend. Rewrite `/api` phải đến backend trước rewrite SPA.
2. Build bằng `npm run build`, output `dist`, rồi deploy.
3. Truy cập frontend qua đúng `FRONTEND_ORIGIN` và đăng nhập. Không gọi
   backend trực tiếp từ frontend: proxy cùng origin cần thiết cho cookie
   HttpOnly, SameSite và kiểm tra origin.

Vercel preview/deployment domain khác sẽ bị từ chối trừ khi được cấu hình
thành `FRONTEND_ORIGIN` riêng cho backend tương ứng. Thay đổi mật khẩu Neon
nếu chuỗi kết nối từng bị chia sẻ; cập nhật biến trên backend và khởi động lại.
Đặt rate limiting ở reverse proxy cho triển khai công khai; giới hạn đăng nhập
trong tiến trình chỉ bổ sung bảo vệ và không chia sẻ giữa các instance.

Sao lưu bằng chức năng xuất JSON trong ứng dụng và Neon backups; dữ liệu JSON
từ backend cũ hoặc file backup không được tự động nhập hay xóa.
