# Debt Management App

Ứng dụng quản lý các khoản vay, thẻ tín dụng, chi tiêu, thu nhập, BHXH và đầu tư.

## Chạy local

Yêu cầu Node.js 18 trở lên và database PostgreSQL trên Neon.

```bash
npm install
cp .env.example .env
```

Trong `.env`, đặt `DATABASE_URL` thành chuỗi kết nối Neon có TLS,
`APP_PASSWORD` thành mật khẩu dài ít nhất 14 ký tự (khuyến nghị mật khẩu
ngẫu nhiên dài ít nhất 20 ký tự) và
`FRONTEND_ORIGIN=http://localhost:3000`. Không commit file `.env`.

```bash
npm run dev:all
```

Truy cập http://localhost:3000 và đăng nhập bằng `APP_PASSWORD`. Vite chuyển
tiếp `/api` đến backend tại cổng 3001. Backend đọc và ghi trực tiếp các bảng
`loans`, `credit_cards`, `fixed_expenses`, `income`, `lendings`, `companies`,
`company_income_records`, `bhxh_adjustment_indices`, `investment_accounts` và
`investment_transactions` trong schema `public`. Các bảng nghiệp vụ phải được
thiết lập trước theo cấu trúc database hiện tại; backend chỉ tự tạo các bảng
phụ `debt_app_sessions` và `debt_app_legacy_investments`.

Khi lưu, backend kiểm tra phiên bản dựa trên nội dung database và ghi trong một
transaction. Nếu dữ liệu đã thay đổi ở phiên khác, kể cả chỉnh trực tiếp trong
database, ứng dụng báo lỗi thay vì ghi đè; hãy xuất dữ liệu trên trang trước
khi tải lại. Lịch sử thu nhập hiện dùng `income.payments`; nếu bảng
`income_payments` có dữ liệu, ứng dụng báo lỗi để tránh bỏ sót dữ liệu.

Giao dịch trong bảng cũ `investments` phải được chuyển sang
`investment_accounts` và `investment_transactions` trước khi sử dụng:

```bash
node server/migrateLegacyInvestments.js
```

Lệnh giữ nguyên bảng cũ, ghi dấu những giao dịch đã chuyển và có thể chạy lại;
nó dừng nếu giao dịch trùng ID nhưng khác nội dung hoặc có nhiều tài khoản
cùng tên. Bảng `investments` sau đó là bản lưu cũ, không tự đồng bộ với các
chỉnh sửa mới. Bảng JSON `debt_app_data` từ backend trước đây không được tự
động nhập hoặc xóa; hãy sao lưu và đối chiếu dữ liệu trước khi nhập thủ công.
Backend đọc `.env` khi khởi động, nên cần khởi động lại sau khi đổi mật khẩu.
Môi trường production yêu cầu mật khẩu ít nhất 20 ký tự.

Xem [DEPLOY.md](./DEPLOY.md) để triển khai frontend và backend tách biệt.
Các tài liệu Supabase còn lại chỉ mang tính lịch sử.

## Kiểm thử database

Với `TEST_DATABASE_URL` trỏ đến kết nối PostgreSQL trực tiếp (không qua
transaction pooler), chạy `node --test server/dataStore.test.js`. Kiểm thử tạo
các bảng tạm riêng cho phiên và không ghi vào các bảng nghiệp vụ.
