# Triển khai trên Vercel với Neon

Frontend Vite và API Express chạy trong cùng dự án Vercel. API được triển khai
thành Vercel Function, kết nối Neon từ server; không cần Railway hay Render.
Không đưa `DATABASE_URL` hoặc `APP_PASSWORD` vào biến `VITE_*` hay frontend.

1. Import repository vào Vercel, chọn framework Vite, build command
   `npm run build` và output directory `dist`.
2. Trong **Project Settings → Environment Variables**, cấu hình cho đúng môi
   trường (Production và/hoặc Preview):
   - `DATABASE_URL`: chuỗi kết nối Neon có TLS và xác thực chứng chỉ; nên dùng
     endpoint pooled của Neon cho serverless.
   - `APP_PASSWORD`: mật khẩu ngẫu nhiên tối thiểu 20 ký tự.
   - `FRONTEND_ORIGIN`: origin HTTPS chính xác của ứng dụng, ví dụ
     `https://debt-management-ten.vercel.app`, không có đường dẫn hoặc `/`
     cuối.
3. Triển khai lại sau khi thay biến môi trường. `/api/*` được xử lý bởi
   Vercel Function trong cùng origin; các URL trang được chuyển tới SPA.
4. Kiểm tra `GET /api/auth/session` khi chưa đăng nhập trả về HTTP 401 JSON,
   sau đó đăng nhập và kiểm tra tải dữ liệu. Nếu lỗi, xem Function Logs trong
   Vercel. Các bảng nghiệp vụ trong `public` phải có sẵn; tài khoản database
   cần quyền đọc/ghi các bảng và tạo bảng phụ cho phiên, migration và giới hạn
   đăng nhập. Xem [README.md](./README.md) để xử lý dữ liệu cũ.

Trên Vercel, kể cả Preview, ứng dụng luôn yêu cầu origin HTTPS, mật khẩu đủ
20 ký tự và dùng cookie Secure. Preview deployment có URL khác sẽ bị kiểm tra origin từ chối nếu không
khớp `FRONTEND_ORIGIN`; dùng domain ổn định và cấu hình riêng cho từng môi
trường. Dùng database staging riêng để tránh ghi nhầm dữ liệu production.

Giới hạn đăng nhập dùng database và áp dụng giữa các instance; nên bổ sung
Vercel Firewall/rate limiting cho dịch vụ công khai. Giới hạn kích thước request
của Vercel có thể thấp hơn giới hạn Express 10 MB, nên file backup quá lớn
có thể không nhập được qua Function. Giới hạn quyền truy cập database và không
dựa vào RLS nếu các bảng đang tắt RLS. Sao lưu qua chức năng xuất JSON và Neon
backups; dữ liệu JSON từ backend cũ không được tự động nhập hay xóa.
